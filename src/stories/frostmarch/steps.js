// Frostmarch flow: every phase hook, prompt, and deterministic consequence.
//
// The session supplies the medium (say/divider/form/choices/classified/enter/
// save). Everything in this file is this story's rules. No DOM access.

import {
  APPROACHES,
  BEAT_ACTIONS,
  CARCASS_ACTIONS,
  DIRECTIONS,
  ESSENCE_ACTIONS,
  ROUTES,
  SPECIALTIES,
  SPECIALTY_MOVES,
  STANCES,
  TACTICS,
  WILD_MUTATIONS,
  explicitDirection
} from './content.js';
import { addUnique } from '../../engine/util.js';

// ---------------------------------------------------------------------------
// Small shared steps

function submitDirection(session) {
  const text = session.answer();
  if (!text) {
    session.status('Choose a direction in your own words.');
    return;
  }

  const direct = explicitDirection(text);
  if (direct.ambiguous) {
    offerRouteFallback(session, text, 'More than one mapped route fits that description. Choose one below.');
    return;
  }
  if (direct.route) {
    applyDirection(session, direct.route, text);
    return;
  }

  session.classified({
    text,
    emptyText: 'Choose a direction in your own words.',
    busyText: 'Reading the route…',
    fields: { direction: [...ROUTES, 'unclear'] },
    context: 'Fixed routes from Keld: north = Graycap Range / Goliath delver; northwest = Giant’s Pass / Frost Giant raider; east = Birchway / White Dragonborn hoarder; south = Mammoth Grounds / mammoth; southwest = Direwolf Wood / direwolf pack. Classify the direction explicitly named or clearly described by the player. If no route is clear, choose unclear.',
    fallbackNote: 'Choose the route you meant.',
    apply: ({ direction }, spoken) => applyDirection(session, direction, spoken)
  });
}

function offerRouteFallback(session, text, note) {
  session.offerFallback({
    text,
    fields: { direction: ROUTES },
    apply: ({ direction }, spoken) => applyDirection(session, direction, spoken)
  }, note);
}

function applyDirection(session, route, text) {
  const direction = DIRECTIONS[route];
  if (!direction) {
    session.unlock();
    offerRouteFallback(session, text, 'No single mapped route was clear. Choose one below.');
    return;
  }

  const { state } = session;
  state.direction = direction.name;
  state.encounter = { ...direction };
  state.essencesFound = direction.essences.slice();
  state.essenceOutcome = null;
  state.mutation = null;
  state.beat = { variant: 0, choice: null };
  state.loot = { materialsTaken: false, meatTaken: false, hideTaken: false };
  state.outcome = null;
  state.defeated = false;

  if (direction.kind === 'wild') {
    state.encounter.essences = direction.essences.slice();
    state.encounter.conflict = direction.conflict;
    if (session.random() < 0.08) {
      state.mutation = WILD_MUTATIONS[Math.floor(session.random() * WILD_MUTATIONS.length)];
      state.encounter.essences.push(state.mutation);
      state.encounter.mutation = state.mutation;
    }
  }

  state.essencesFound = state.encounter.essences.slice();
  state.monster = direction.monster;
  state.monsterKind = direction.kind;
  state.conflictFocus = direction.species;
  state.combat = {
    foeHP: direction.vitality,
    pressure: 0,
    rounds: 0,
    exposed: false,
    allyHelpUsed: false,
    negotiated: false,
    bloodDrawn: false,
    braced: false
  };

  session.player(text);
  session.say(`You travel ${direction.name}.`, 'annotation');
  session.say(direction.scene);
  session.say(state.encounter.conflict, 'bridge');
  session.divider();
  startBeat(session);
}

// The beat is a short approach scene before the fight. It is deterministic:
// the seed picks one of the authored variants, and the player's described
// approach picks one of the authored consequences.
function startBeat(session) {
  const { state } = session;
  const beat = DIRECTIONS[state.direction]?.beat;
  if (!beat) {
    session.enter('fight');
    return;
  }
  state.beat = {
    variant: Math.floor(session.random() * beat.variants.length) % beat.variants.length,
    choice: null
  };
  session.say(beat.variants[state.beat.variant]);
  session.enter('beat');
}

function submitBeat(session) {
  const { state } = session;
  session.classified({
    text: session.answer(),
    emptyText: 'Write what you do first.',
    busyText: 'Reading your approach…',
    fields: { beat: [...BEAT_ACTIONS] },
    context: `The player is closing on ${state.monster} (${state.encounter?.species}) in ${state.encounter?.region} and has not been seen yet. Classify the approach. careful = watch, read the ground, take position, wait. bold = charge, close fast, commit. clever = use the moment for gain, take something, set a trap.`,
    fallbackNote: 'Choose the approach closest to what you described.',
    apply: ({ beat }, spoken) => resolveBeat(session, spoken, beat)
  });
}

function resolveBeat(session, text, label) {
  const { state } = session;
  const beat = DIRECTIONS[state.direction]?.beat;
  const option = beat?.options?.[label];
  const effect = option?.effect || {};
  const notes = [];

  session.player(text);
  state.beat.choice = label;

  if (effect.edge) {
    state.combat.exposed = true;
    notes.push('The first opening is yours.');
  }
  if (effect.wound) {
    state.combat.foeHP = Math.max(1, state.combat.foeHP - effect.wound);
    state.combat.bloodDrawn = true;
    notes.push(`${state.monster} is already hurt.`);
  }
  if (effect.hurt) {
    state.health = Math.max(1, state.health - effect.hurt);
    state.injuries.push('bruised ribs');
    notes.push('You carry a knock into the fight.');
  }
  if (effect.bonus) {
    addUnique(state.essencesFound, effect.bonus);
    state.encounter.essences = state.essencesFound.slice();
    notes.push(`You also carry ${effect.bonus}-aligned essence.`);
  }
  if (effect.standing) {
    const species = state.encounter.species;
    state.factionStanding[species] = (state.factionStanding[species] || 0) + effect.standing;
    notes.push(`${species} will remember that you left their claim standing.`);
  }

  session.say(`The approach resolves as ${label}.`, 'annotation');
  session.say(option?.outcome || 'You wait, and the moment passes. Nothing is gained.', 'bridge');
  if (notes.length) session.say(notes.join(' '), 'annotation');
  session.divider();
  session.stats();
  session.enter('fight');
}

function submitFight(session) {
  const { state } = session;
  const moves = SPECIALTY_MOVES[state.specialty] || [];
  const tacticLabels = [...TACTICS.filter(label => label !== 'other'), ...moves, 'other'];
  const moveHelp = moves.length
    ? ` The ${state.specialty} specialty also allows: ${moves.join(', ')}.`
    : '';
  session.classified({
    text: session.answer(),
    emptyText: 'Write an action first.',
    busyText: 'Reading your action…',
    fields: { tactic: tacticLabels },
    context: `Encounter with ${state.monster}, a ${state.encounter?.species} threat. Kind: ${state.monsterKind}. Terrain: ${state.encounter?.region}. Specialty: ${state.specialty}. Gear charges: ${state.gear}. Companion present: ${state.companion}. Current enemy vitality: ${state.combat?.foeHP}/${state.encounter?.vitality}. Current danger: ${state.combat?.pressure}. Blood has been drawn: ${!!state.combat?.bloodDrawn}. For an intelligent humanoid opponent, classify attempts to communicate, bargain, warn, or trade as negotiate. For an animal, do not classify nonverbal calming as negotiation.${moveHelp}`,
    fallbackNote: 'Choose the tactic closest to what you described.',
    apply: ({ tactic }, spoken) => resolveCombat(session, spoken, tactic)
  });
}

function resolveCombat(session, text, tactic) {
  const { state } = session;
  const combat = state.combat;
  const enemy = state.encounter;
  if (!combat || !enemy) {
    session.status('The encounter state is missing. Start a new run.');
    session.unlock();
    return;
  }

  session.player(text);
  combat.rounds += 1;
  const intelligent = ['goliath', 'giant', 'dragonborn'].includes(state.monsterKind);
  const standing = state.factionStanding[enemy.species] || 0;
  // You can talk before steel is drawn. Once blood is on the ground, only a
  // faction that already respects you will still listen.
  const canParley = !combat.bloodDrawn || standing >= 1;

  if (tactic === 'retreat') {
    state.outcome = 'retreat';
    state.defeated = false;
    state.essencesFound = [];
    state.essenceOutcome = null;
    state.loot = { materialsTaken: false, meatTaken: false, hideTaken: false };
    announceCombat(session, tactic, `You choose to withdraw. ${state.monster} holds the ground; you make it back toward Keld without a body or essence.`);
    return;
  }

  if (tactic === 'negotiate' && intelligent && !combat.negotiated && canParley) {
    combat.negotiated = true;
    state.outcome = 'parley';
    state.defeated = false;
    state.reputation += 1;
    state.factionStanding[enemy.species] = (state.factionStanding[enemy.species] || 0) + 1;
    state.essencesFound = [];
    state.essenceOutcome = null;
    state.loot = { materialsTaken: false, meatTaken: false, hideTaken: false };
    session.say('The encounter resolves as a parley.', 'annotation');
    session.say(`You lower your weapon and put terms between you and the ${enemy.species}. They listen. No body falls, no essence is taken, and the dispute over ${enemy.region} is left for another day.`, 'bridge');
    session.divider();
    session.stats();
    startReturn(session);
    return;
  }

  let damage = 0;
  let pressure = enemy.threat;
  let description = '';
  const skilledAttack = (state.specialty === 'strong' || state.specialty === 'quick') && tactic === 'attack';
  const skilledTerrain = ['tracker', 'observant', 'cunning'].includes(state.specialty)
    && ['evade', 'use_environment'].includes(tactic);

  if (tactic === 'attack') {
    damage = skilledAttack ? 2 : 1;
    description = skilledAttack
      ? 'Your practiced strength or speed finds a clean opening.'
      : 'You commit to a direct attack.';
  } else if (tactic === 'evade') {
    pressure = combat.exposed ? enemy.threat : Math.max(0, enemy.threat - 1);
    combat.exposed = true;
    description = combat.rounds === 1
      ? 'You give ground, watch the opponent’s rhythm, and look for an opening.'
      : 'You keep giving ground, but the opponent is learning your pattern.';
  } else if (tactic === 'use_environment') {
    const freshOpening = !combat.exposed;
    damage = skilledTerrain && freshOpening ? 1 : 0;
    pressure = skilledTerrain && freshOpening
      ? 0
      : combat.exposed
        ? enemy.threat
        : Math.max(0, enemy.threat - 1);
    combat.exposed = true;
    description = damage
      ? 'You use the terrain to create an opening and disrupt the attack.'
      : combat.exposed && !freshOpening
        ? 'The opponent anticipates your repeated use of the terrain.'
        : 'You change position and make the opponent adjust.';
  } else if (tactic === 'use_gear') {
    if (state.gear > 0) {
      state.gear -= 1;
      damage = 2;
      pressure = 0;
      description = 'Your prepared gear gives you a strong, controlled opening.';
    } else {
      pressure = enemy.threat + 1;
      description = 'You reach for gear you did not bring. The moment costs you.';
    }
  } else if (tactic === 'endure' && state.specialty === 'enduring') {
    combat.braced = true;
    pressure = 0;
    description = 'You plant your feet and take the blow on your guard instead of giving ground.';
  } else if (tactic === 'mend' && state.specialty === 'healer') {
    pressure = Math.max(0, enemy.threat - 1);
    if (state.health < state.maxHealth) {
      state.health += 1;
      state.injuries.pop();
      description = 'You bind the worst wound with a strip of cloak. The foe closes while your hands are busy.';
    } else {
      description = 'You have no wound to bind. The pause only steadies you.';
    }
  } else if (tactic === 'negotiate') {
    pressure = enemy.threat + 1;
    if (!intelligent) {
      description = 'The animal does not understand your words. It presses closer.';
    } else if (!canParley) {
      description = `${enemy.species} see the blood on your weapon and will not hear terms. They press the attack.`;
    } else {
      description = 'You repeat your terms without offering anything new. The rival treats it as delay and presses the attack.';
    }
  } else {
    pressure = enemy.threat + 1;
    description = 'You hesitate; the opponent uses the opening.';
  }

  if (combat.exposed && tactic === 'attack') {
    damage += 1;
    combat.exposed = false;
    description += ' The opening improves your strike.';
  }

  if (state.companion && !combat.allyHelpUsed && pressure > 0) {
    pressure = Math.max(0, pressure - 1);
    combat.allyHelpUsed = true;
    description += ' Your companion draws its attention long enough for you to move.';
  }

  combat.foeHP = Math.max(0, combat.foeHP - damage);
  if (damage > 0) combat.bloodDrawn = true;
  combat.pressure = Math.max(0, combat.pressure + pressure);

  if (combat.pressure >= enemy.threat + 1) {
    if (combat.braced) {
      combat.braced = false;
      combat.pressure = 0;
      description += ' The blow lands on your guard and costs you nothing.';
    } else {
      state.health = Math.max(0, state.health - 1);
      state.injuries.push('fresh wound');
      combat.pressure = 0;
      description += ' The opponent lands a blow before you can reset your footing.';
    }
  }

  if (combat.foeHP === 0) {
    state.defeated = true;
    state.outcome = 'victory';
    state.essencesFound = (enemy.essences || []).slice();
    description += state.monsterKind === 'wild'
      ? (state.monster === 'direwolf pack'
        ? ' One wolf falls; the rest of the pack scatters.'
        : 'The mammoth falls after a costly struggle; the herd withdraws, still dangerous.')
      : ` The ${state.monster} falls. Its death leaves essences behind.`;
    if (intelligent) {
      state.factionStanding[enemy.species] = (state.factionStanding[enemy.species] || 0) - 1;
      description += ` ${enemy.species} will hear that one of theirs did not come home.`;
    }
  } else if (state.health === 0) {
    state.defeated = false;
    state.outcome = 'collapse';
    state.essencesFound = [];
    state.essenceOutcome = null;
    description += ` You collapse, and a hunting party from Keld finds you before nightfall. ${state.monster} survives.`;
  }

  announceCombat(session, tactic, description);
}

function announceCombat(session, tactic, description) {
  const { state } = session;
  session.say(`The fight resolves as ${tactic}.`, 'annotation');
  session.say(description, 'bridge');
  session.divider();
  session.stats();

  if (state.outcome === 'victory') {
    state.loot = { materialsTaken: false, meatTaken: false, hideTaken: false };
    session.enter('loot');
  } else if (state.outcome === 'retreat' || state.outcome === 'collapse') {
    startReturn(session);
  } else {
    session.enter('fight');
  }
}

function submitLoot(session) {
  const { state } = session;
  session.classified({
    text: session.answer(),
    emptyText: 'Write what you do first.',
    busyText: 'Reading your action…',
    fields: { essence: ESSENCE_ACTIONS, carcass: CARCASS_ACTIONS },
    context: `After the fight, the remains of ${state.monster} contain essences aligned with ${state.essencesFound.join(', ') || 'nothing clear'}. ${state.monsterKind === 'wild' ? 'The animal can provide meat and hide.' : 'The body can provide evidence or materials.'} Character specialty: ${state.specialty}.`,
    fallbackNote: 'Choose what happens to the essence and the remains.',
    apply: ({ essence, carcass }, spoken) => resolveLoot(session, spoken, essence, carcass)
  });
}

function resolveLoot(session, text, essence, carcass) {
  const { state } = session;
  session.player(text);
  const types = state.essencesFound.slice();
  state.essenceOutcome = { disposition: essence, types };

  let essenceText;
  if (essence === 'keep') {
    for (const type of types) addUnique(state.inventory.essences, type);
    essenceText = 'You wrap the essence carefully. It remains with you, strange and faintly warm.';
  } else if (essence === 'consume') {
    state.health = Math.min(3, state.health + 1);
    essenceText = 'The essence burns as it passes your lips. Its warmth eases one of your wounds, though its nature is still uncertain.';
  } else if (essence === 'offer') {
    state.reputation += 1;
    essenceText = 'You set the essence aside as an offering. Someone in the village will decide what it means.';
  } else if (essence === 'destroy') {
    essenceText = 'The essence gutters out. Nothing remains of it.';
  } else if (essence === 'leave') {
    essenceText = 'You leave the essence where it lies.';
  } else {
    essenceText = 'You leave the essence where it lies.';
  }

  let remainsText;
  if (carcass === 'harvest') {
    if (state.monsterKind === 'wild') {
      state.loot.meatTaken = true;
      state.loot.hideTaken = true;
      addUnique(state.inventory.materials, 'meat');
      addUnique(state.inventory.materials, 'hide');
      remainsText = ' You take meat and hide from the animal.';
    } else {
      state.loot.materialsTaken = true;
      addUnique(state.inventory.materials, 'materials');
      remainsText = ' You take the useful materials and evidence from the body.';
    }
  } else if (carcass === 'leave') {
    state.loot = { materialsTaken: false, meatTaken: false, hideTaken: false };
    remainsText = ' You leave the rest of the remains undisturbed.';
  } else {
    state.loot = { materialsTaken: false, meatTaken: false, hideTaken: false };
    remainsText = ' You leave the rest of the remains where they lie.';
  }

  session.say(`The annotator reads your choice as ${essence} the essence and ${carcass} the remains.`, 'annotation');
  session.say(essenceText + remainsText, 'bridge');
  session.divider();
  session.stats();
  startReturn(session);
}

function startReturn(session) {
  const { state } = session;
  session.say('You turn back toward the village. The walk is slower with the weight of your choices and any wounds you carry.');

  if (state.outcome === 'parley') {
    session.say('You carry no body and no essence home, only the terms you spoke and the standing they may earn.', 'bridge');
  } else if (state.loot.meatTaken) {
    session.say('You bring meat and hide back from the hunt.');
  } else if (state.loot.materialsTaken) {
    session.say('You bring back materials and evidence from the remains.');
  } else {
    session.say('You return without gathering anything from the remains.');
  }

  if (state.outcome === 'collapse') {
    session.say('You wake beside the hearth with the healer working over you. The hunting party brought you back before nightfall, and the healer brings you back to one measure of strength.', 'bridge');
    state.health = 1;
  }

  if (state.health < 3) {
    const injury = state.injuries.at(-1);
    session.say(injury ? `Your ${injury} aches with every step.` : 'Your wounds ache with every step.');
  }

  const standing = state.factionStanding[state.conflictFocus] || 0;
  if (standing > 0) {
    session.say(`Word has gone ahead of you: the ${state.conflictFocus} speak of a hunter who respected their claim.`, 'bridge');
  } else if (standing < 0) {
    session.say(`Word has gone ahead of you, and it is not kind: the ${state.conflictFocus} name you a killer of their people.`, 'bridge');
  }

  session.divider();
  session.stats();
  session.enter('audience');
}

function chooseAudience(session, id) {
  if (id === 'free') {
    session.enter('audience-name');
    return;
  }
  const name = {
    elder: 'the elder',
    healer: 'the healer',
    rival: 'your rival',
    kin: 'your family',
    hunter: 'the hunt leader'
  }[id];
  session.state.audience = name;
  session.enter('talk');
}

function audienceWho(value) {
  const named = {
    'the elder': 'The elder',
    'the healer': 'The healer',
    'your rival': 'Your rival',
    'your family': 'Your family',
    'the hunt leader': 'The hunt leader'
  };
  return named[value] || String(value || 'Someone');
}

function submitTalk(session) {
  const { state } = session;
  session.classified({
    text: session.answer(),
    emptyText: 'Say something first.',
    busyText: 'Reading your words…',
    fields: { stance: STANCES },
    context: `Returning from a hunt. Audience: ${state.audience}. Outcome: ${state.outcome || 'unknown'}. Loot: meat=${!!state.loot.meatTaken}, materials=${!!state.loot.materialsTaken}, essence=${state.essenceOutcome?.disposition || 'none'}. Injuries: ${state.injuries.join(', ') || 'none'}.`,
    fallbackNote: 'Choose the manner closest to what you said.',
    apply: ({ stance }, spoken) => resolveTalk(session, spoken, stance)
  });
}

function resolveTalk(session, text, stance) {
  const { state } = session;
  session.player(text);
  session.say(`The annotator reads your manner as ${stance}.`, 'annotation');
  const who = audienceWho(state.audience);
  let end;

  if (stance === 'truthful') {
    end = `${who} listens without interrupting. The hunt will be remembered as you described it, including its cost.`;
  } else if (stance === 'boastful') {
    end = `${who} studies the evidence you brought back, weighing your words against the wounds and the meat.`;
  } else if (stance === 'apologetic') {
    end = `${who} accepts your account, though the village still has to reckon with what was lost or gained.`;
  } else {
    end = `${who} lets the silence stand. What you chose not to say remains between you.`;
  }

  if (state.essenceOutcome?.disposition === 'offer') {
    end += ' The essence is taken into the village’s keeping.';
  }
  if (state.essenceOutcome?.disposition === 'consume') {
    end += ' A faint warmth lingers beneath your skin.';
  }
  if (state.outcome === 'parley') {
    end += ' The terms you brought back will be debated before the next hunt.';
  } else if (state.outcome === 'collapse') {
    end += ' The healer keeps you near the fire until your strength returns.';
  } else if (state.outcome === 'retreat') {
    end += ' The elders note that you chose to come back alive.';
  }

  const standing = state.factionStanding[state.conflictFocus] || 0;
  if (standing > 0) {
    end += ` The ${state.conflictFocus} will hear that Keld kept faith.`;
  } else if (standing < 0) {
    end += ` The ${state.conflictFocus} will not forget what you did on that trail.`;
  }

  session.say(end, 'end');
  session.divider();
  session.enter('end');
}

// ---------------------------------------------------------------------------
// Phase hooks, keyed by phase id. `enter` may write narration and must render
// a prompt. `restoring` is true when the transcript already holds the scene.

export const steps = {
  gender: {
    enter(session) {
      session.form(
        'How do you describe your gender?',
        'Use your own words, or leave blank…',
        'Continue',
        () => {
          const spoken = session.answer();
          session.state.gender = spoken || 'unspecified';
          if (spoken) session.player(spoken);
          else session.say('You leave the question unanswered.', 'bridge');
          session.enter('specialty');
        }
      );
    }
  },

  specialty: {
    enter(session, { restoring }) {
      if (!restoring) {
        session.say('The hearth-keeper turns a carved token in her palm. “What are you known for among your people?”');
      }
      session.form(
        'Describe your specialty in your own words.',
        'A knack, practice, reputation, or way of seeing…',
        'Continue',
        () => {
          session.classified({
            text: session.answer(),
            emptyText: 'Write a response first.',
            busyText: 'Reading your description…',
            fields: { specialty: SPECIALTIES },
            context: 'Character creation. Map a freeform self-description to the closest practical specialty.',
            fallbackNote: 'Choose the specialty closest to what you described.',
            apply: ({ specialty }, spoken) => {
              const { state } = session;
              state.specialty = specialty;
              state.specialtyText = spoken;
              session.player(spoken);
              session.say(`The hearth-keeper records you as ${specialty}.`, 'annotation');
              session.divider();
              startHunt(session);
            }
          });
        }
      );
    }
  },

  hunt: {
    enter(session) {
      session.form(
        'What do you do?',
        'Describe your preparation and departure…',
        'Set out',
        () => {
          session.classified({
            text: session.answer(),
            emptyText: 'Write an action first.',
            busyText: 'Reading your action…',
            fields: { approach: APPROACHES },
            context: 'You are setting out from Keld to hunt. Identify the main approach.',
            fallbackNote: 'Choose the approach closest to what you described.',
            apply: ({ approach }, spoken) => {
              const { state } = session;
              session.player(spoken);
              state.gear = approach === 'prepare' ? 2 : approach === 'ask_for_help' ? 1 : 0;
              state.companion = approach === 'ask_for_help';
              const detail = state.companion
                ? ' with a Keld hunter who agreed to come'
                : approach === 'prepare'
                  ? ' with two pieces of useful hunting gear'
                  : approach === 'leave_quickly'
                    ? ' before gathering extra gear'
                    : '';
              session.say(`You set out${detail}.`, 'bridge');
              session.stats();
              session.divider();
              startDirection(session);
            }
          });
        }
      );
    }
  },

  direction: {
    enter(session, { restoring }) {
      if (!restoring) {
        session.say('Five trails leave Keld: north into the Graycap Range; northwest through Giant’s Pass; east along the Birchway; south onto the Mammoth Grounds; southwest into Direwolf Wood. Each route is distinct. Where do you go?');
      }
      session.form(
        'Where do you travel, and why?',
        'Name north, northwest, east, south, or southwest…',
        'Follow the trail',
        () => submitDirection(session)
      );
    }
  },

  beat: {
    enter(session) {
      const beat = DIRECTIONS[session.state.direction]?.beat;
      if (!beat) {
        session.enter('fight');
        return;
      }
      session.form(
        beat.prompt,
        'Describe what you do before the fight…',
        'Close in',
        () => submitBeat(session)
      );
    }
  },

  fight: {
    enter(session, { restoring }) {
      const { state } = session;
      if (!state.combat || !state.encounter) {
        session.status('The encounter state is missing. Start a new run.');
        return;
      }
      const foeHP = state.combat.foeHP ?? 1;
      const round = (state.combat.rounds ?? 0) + 1;
      const ally = state.companion && !state.combat.allyHelpUsed
        ? ' A hunting companion is watching for an opening.'
        : '';
      if (!restoring) {
        session.say(`Round ${round}: ${state.monster} — vitality ${foeHP}/${state.encounter.vitality}; your health ${state.health}/3; danger ${state.combat.pressure || 0}/${state.encounter.threat + 1}.${ally}`, 'annotation');
      }
      session.form(
        `What do you do against the ${state.monster}?`,
        'Describe your tactic, including how you use the terrain or gear…',
        'Take action',
        () => submitFight(session)
      );
    }
  },

  loot: {
    enter(session, { restoring }) {
      const { state } = session;
      if (!restoring) {
        const essences = state.essencesFound.length
          ? state.essencesFound.map(essence => `${essence}-aligned`).join(', ')
          : 'no clear essence';
        const remains = state.monsterKind === 'wild'
          ? ' This animal may also provide meat and hide.'
          : ' The body may hold useful materials and evidence of its claim.';
        const mutation = state.mutation
          ? ` This individual carried a rare ${state.mutation} mutation.`
          : '';
        session.say(`In the remains, these essences glimmer faintly: ${essences}.${remains}${mutation} What do you do with the remains and essence?`);
      }
      session.form(
        'Describe what you take, leave, or use.',
        'Say what you take, leave, or use…',
        'Handle the remains',
        () => submitLoot(session)
      );
    }
  },

  audience: {
    enter(session, { restoring }) {
      const { state } = session;
      if (!restoring) {
        const conflict = state.conflictFocus || 'the contested lands';
        session.say(`Word of your return reaches the central hearth. People gather around the news from ${state.direction || 'the trail'}: ${conflict} remain in conflict with the village. Who do you seek out first?`);
      }
      session.choices('Choose someone to speak with.', [
        ['elder', 'The elder'],
        ['healer', 'The healer'],
        ['rival', 'Your rival'],
        ['kin', 'Your family'],
        ['hunter', 'The hunt leader'],
        ['free', 'Someone else']
      ], id => chooseAudience(session, id));
    }
  },

  'audience-name': {
    enter(session) {
      session.form(
        'Who do you seek out?',
        'Name the person or describe them…',
        'Find them',
        () => {
          const name = session.answer();
          if (!name) {
            session.status('Name someone first.');
            return;
          }
          session.state.audience = name;
          session.enter('talk');
        }
      );
    }
  },

  talk: {
    enter(session, { restoring }) {
      const { state } = session;
      const who = state.audience || 'someone at the hearth';
      if (!restoring) {
        session.say(`You find ${who} at the hearth. Their attention settles first on what you carried home, then on your face. “Tell me what happened.”`);
        if (state.encounter?.conflict) session.say(state.encounter.conflict, 'bridge');
      }
      session.form(
        'What do you tell them?',
        'Speak in your own words…',
        'Tell your story',
        () => submitTalk(session)
      );
    }
  },

  end: {
    enter(session) {
      session.endButton('Play again', () => session.begin());
    }
  }
};

function startHunt(session) {
  session.stats();
  session.say('At first light you shoulder your hunting gear. Keld needs meat, and the elders expect you to return with more than a story. What do you do to prepare and set out?');
  session.enter('hunt');
}

function startDirection(session) {
  session.enter('direction');
}
