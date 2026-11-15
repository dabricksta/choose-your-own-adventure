// Frostmarch content. Everything a model may classify lives here as a closed
// label set, and every label the manual fallback can offer is named here.
//
// This file is content and data only. Consequences live in steps.js.

export const SPECIALTIES = [
  'strong', 'quick', 'enduring', 'observant', 'cunning', 'healer', 'tracker', 'leader', 'other'
];

export const APPROACHES = ['prepare', 'ask_for_help', 'leave_quickly', 'other'];
export const TACTICS = ['attack', 'evade', 'use_environment', 'use_gear', 'negotiate', 'retreat', 'other'];
export const BEAT_ACTIONS = ['careful', 'bold', 'clever', 'other'];

// Specialty moves are extra tactic labels. A player only ever sees the move
// that belongs to their chosen specialty.
export const SPECIALTY_MOVES = {
  enduring: ['endure'],
  healer: ['mend']
};

export const ESSENCE_ACTIONS = ['keep', 'consume', 'offer', 'destroy', 'leave', 'other'];
export const CARCASS_ACTIONS = ['harvest', 'leave', 'other'];
export const STANCES = ['truthful', 'boastful', 'guarded', 'apologetic', 'other'];

export const MONSTER_KINDS = ['goliath', 'giant', 'dragonborn', 'wild'];
export const OUTCOMES = ['victory', 'retreat', 'collapse', 'parley'];

export const PHASES = [
  'gender', 'specialty', 'hunt', 'direction', 'beat', 'fight', 'loot',
  'audience', 'audience-name', 'talk', 'end'
];

export const DIRECTIONS = {
  north: {
    name: 'north',
    region: 'Graycap Range',
    species: 'Goliaths',
    monster: 'Goliath delver',
    kind: 'goliath',
    vitality: 3,
    threat: 1,
    essences: ['stone', 'earth', 'ice'],
    conflict: 'Goliath prospectors claim mountain dungeons and valuable mineral seams. Their claims put them in direct competition with Keld’s miners.',
    scene: 'North of Keld, the Graycap Range rises above the treeline. At a marked cavern near an old dungeon entrance, a Goliath delver tests a fresh mineral seam.',
    beat: {
      variants: [
        'A rockfall has half-buried the trail, and the delver’s chisel marks are fresh in the cavern wall.',
        'The cavern is quiet except for the tap of a chisel. Lantern light moves behind a fold of rock.'
      ],
      prompt: 'The delver has not seen you yet. What do you do before you close?',
      options: {
        careful: {
          outcome: 'You keep to the shadow and read the seam: a loose face above the delver, and a claim marker older than Keld’s charter. You leave the marker standing and take the high path. It will not expect you from there.',
          effect: { edge: true, standing: 1 }
        },
        bold: {
          outcome: 'You cross the rubble at a run and drive it off the seam before it can set its feet. Its chisel catches your shoulder, but it gives ground with blood on its arm.',
          effect: { wound: 1, hurt: 1 }
        },
        clever: {
          outcome: 'You work a fist-sized nodule free from the loose face while it is turned away. The delver hears the scrape and turns.',
          effect: { bonus: 'metal' }
        }
      }
    }
  },
  northwest: {
    name: 'northwest',
    region: 'Giant’s Pass',
    species: 'Frost Giants',
    monster: 'Frost Giant raider',
    kind: 'giant',
    vitality: 4,
    threat: 2,
    essences: ['martial', 'earth', 'ice'],
    conflict: 'Frost Giants travel the high passes in nomadic bands. They compete for dungeon sites and sometimes raid human villages for supplies.',
    scene: 'Northwest of Keld, the old Giant’s Pass cuts between the Graycap foothills and the western crags. A Frost Giant raider has left the band’s trail and is carrying village stores toward the pass.',
    beat: {
      variants: [
        'Snow begins to fall in flat, heavy flakes. The raider’s trail crosses a frozen stream and keeps climbing.',
        'The wind turns down the pass, carrying the smell of the village stores the raider is hauling.'
      ],
      prompt: 'The raider is ahead of you in the snow. What do you do before you close?',
      options: {
        careful: {
          outcome: 'You follow upwind and read where it stopped to rest. Its tracks say it will not look uphill. You come at it from above, and leave its band-marker untouched.',
          effect: { edge: true, standing: 1 }
        },
        bold: {
          outcome: 'You close while the snow hides you and put your spear into its thigh. The haft kicks back into your ribs.',
          effect: { wound: 1, hurt: 1 }
        },
        clever: {
          outcome: 'You cut the lashings on its sled. A sack splits and pass-salt spills across the trail; the raider stops to gather it.',
          effect: { bonus: 'salt' }
        }
      }
    }
  },
  east: {
    name: 'east',
    region: 'Birchway',
    species: 'White Dragonborn',
    monster: 'White Dragonborn hoarder',
    kind: 'dragonborn',
    vitality: 3,
    threat: 1,
    essences: ['martial', 'fire', 'ice'],
    conflict: 'White Dragonborn compete for dungeons. Their hoarding brings them into conflict with humans over wealth, stored goods, and trade.',
    scene: 'East of Keld, the Birchway follows the Rimewood supply road. A White Dragonborn has stopped a village-bound sled and is sorting valuables from its cargo; fresh marks point toward a nearby dungeon.',
    beat: {
      variants: [
        'The sled driver sits in the snow with a cut brow, watching the Dragonborn sort through the cargo.',
        'Broken crate slats mark the road. The Dragonborn works methodically, setting aside what it means to keep.'
      ],
      prompt: 'The Dragonborn is still sorting the sled. What do you do before you close?',
      options: {
        careful: {
          outcome: 'You watch how it sorts: tools kept, grain discarded. Now you know what it values. It never looks upslope, where you wait.',
          effect: { edge: true, standing: 1 }
        },
        bold: {
          outcome: 'You put yourself between it and the sled. Its claws rake your forearm before it gives ground, bleeding.',
          effect: { wound: 1, hurt: 1 }
        },
        clever: {
          outcome: 'You pull the driver clear and take the strongbox key from the wreck. Neither of you has been noticed yet.',
          effect: { bonus: 'silver' }
        }
      }
    }
  },
  south: {
    name: 'south',
    region: 'Mammoth Grounds',
    species: 'mammoth herds',
    monster: 'mammoth',
    kind: 'wild',
    vitality: 3,
    threat: 1,
    essences: ['beast', 'ice'],
    conflict: 'Keld’s people hunt mammoths for food and materials, but the herds defend themselves when threatened.',
    scene: 'South of Keld, the Mammoth Grounds spread across open tundra. A herd has bunched around its calves, and the adults turn toward you as you approach.',
    beat: {
      variants: [
        'The herd shifts, calves pressed to the middle. A yearling lags at the edge of the drift.',
        'The ground is churned to mud where the herd has stood. One old bull stands apart, favoring a foreleg.'
      ],
      prompt: 'The herd has not scattered yet. What do you do before you close?',
      options: {
        careful: {
          outcome: 'You circle downwind and pick out the animal the herd can spare. The wind holds your scent away from the rest.',
          effect: { edge: true }
        },
        bold: {
          outcome: 'You break from cover and drive the herd apart. You cut the yearling off — and a shoulder shoves you into the snow before it turns.',
          effect: { wound: 1, hurt: 1 }
        },
        clever: {
          outcome: 'You leave the calves and take the old bull’s trail instead, with a tuft of its coat that still holds regrowth essence.',
          effect: { bonus: 'regrowth' }
        }
      }
    }
  },
  southwest: {
    name: 'southwest',
    region: 'Direwolf Wood',
    species: 'direwolf packs',
    monster: 'direwolf pack',
    kind: 'wild',
    vitality: 2,
    threat: 2,
    essences: ['beast', 'ice'],
    conflict: 'Keld’s people hunt wild animals, while direwolf packs hunt lone travelers and small groups moving through the western wood.',
    scene: 'Southwest of Keld, scrub pine thickens into Direwolf Wood. A pack has caught your scent and begins to circle downwind, testing whether you are alone.',
    beat: {
      variants: [
        'The hunt-call answers from three sides. One wolf breaks cover to test you.',
        'The pack goes quiet, which is worse. Only the tester shows itself, head low.'
      ],
      prompt: 'The tester is deciding whether to commit. What do you do before you close?',
      options: {
        careful: {
          outcome: 'You climb the dead pine and count six from the branch. There is a gap at the downwind edge. That is where you will fight.',
          effect: { edge: true }
        },
        bold: {
          outcome: 'You meet the tester head-on before the pack commits. It yelps and falls back, but another wolf rakes your calf first.',
          effect: { wound: 1, hurt: 1 }
        },
        clever: {
          outcome: 'You set a snare line in the scrub and let them come to it. In the roots you find a shadow-venom sac left by something that died there.',
          effect: { bonus: 'venom' }
        }
      }
    }
  }
};

export const ROUTES = Object.keys(DIRECTIONS);

export const WILD_MUTATIONS = ['stone', 'fire', 'lightning', 'shadow', 'venom', 'regrowth'];

// Demo-mode keyword rules, keyed by the closed field name. The engine's
// keyword classifier is generic; these words are this story's.
export const DEMO_RULES = {
  specialty: [
    ['strong', ['strong', 'strength', 'lift', 'power', 'muscle', 'muscular']],
    ['quick', ['quick', 'fast', 'speed', 'agile', 'agility']],
    ['enduring', ['endure', 'enduring', 'stamina', 'cold', 'long']],
    ['healer', ['heal', 'healer', 'healing', 'medicine', 'herb', 'herbs', 'wound', 'wounds']],
    ['tracker', ['track', 'tracks', 'tracking', 'trail', 'trails', 'scout', 'scouting', 'sign', 'signs']],
    ['cunning', ['clever', 'cunning', 'trap', 'traps', 'trick', 'tricks', 'plan', 'plans']],
    ['leader', ['lead', 'leader', 'leading', 'organize', 'people', 'persuade', 'persuasion']],
    ['observant', ['observe', 'observant', 'notice', 'watch', 'see', 'perceive', 'perceptive', 'aware']]
  ],
  approach: [
    ['ask_for_help', ['help', 'companion', 'party', 'invite', 'hunter', 'come with me', 'with me', 'join me']],
    ['prepare', ['prepare', 'pack', 'gear', 'food', 'map', 'weapon']],
    ['leave_quickly', ['leave now', 'rush', 'quickly', 'without']]
  ],
  direction: [
    ['northwest', ['northwest', "giant's pass", 'frost giant']],
    ['north', ['north', 'graycap', 'mountain']],
    ['east', ['east', 'birchway', 'rimewood']],
    ['southwest', ['southwest', 'direwolf wood', 'direwolf']],
    ['south', ['south', 'mammoth grounds', 'mammoth']]
  ],
  tactic: [
    ['retreat', ['retreat', 'run away', 'flee', 'withdraw', 'escape']],
    ['mend', ['bind', 'bandage', 'treat', 'mend', 'heal', 'herb', 'herbs', 'salve', 'patch', 'stop the bleeding']],
    ['endure', ['brace', 'endure', 'grit', 'stand firm', 'weather the', 'take the blow', 'set my feet', 'dig in']],
    ['negotiate', ['talk', 'trade', 'parley', 'negotiate', 'offer terms', 'promise']],
    ['use_gear', ['gear', 'weapon', 'rope', 'spear', 'knife', 'bow']],
    ['use_environment', ['tree', 'rock', 'ice', 'terrain', 'fire', 'trap']],
    ['evade', ['dodge', 'evade', 'avoid', 'duck', 'circle']],
    ['attack', ['attack', 'strike', 'stab', 'shoot', 'hit', 'fight']]
  ],
  beat: [
    ['clever', ['snare', 'cut the', 'pry', 'sample', 'pull', 'spill', 'lashings', 'strongbox', 'pocket', 'sabotage']],
    ['careful', ['study', 'watch', 'observe', 'read', 'circle', 'wait', 'follow', 'downwind', 'upwind', 'climb', 'count', 'mark', 'shadow', 'keep to']],
    ['bold', ['charge', 'rush', 'run at', 'close', 'drive', 'break', 'meet', 'straight at', 'head-on']]
  ],
  essence: [
    ['consume', ['eat', 'drink', 'consume', 'swallow', 'absorb']],
    ['offer', ['offer', 'give', 'gift']],
    ['destroy', ['destroy', 'burn', 'smash', 'break']],
    ['keep', ['keep', 'pocket', 'carry', 'save', 'take']],
    ['leave', ['leave', 'abandon', 'discard']]
  ],
  carcass: [
    ['harvest', ['harvest', 'butcher', 'skin', 'cut up', 'take meat']],
    ['leave', ['leave', 'abandon', 'bury']]
  ],
  stance: [
    ['boastful', ['greatest', 'best hunter', 'boast', 'brag']],
    ['apologetic', ['sorry', 'apologize', 'regret', 'fault']],
    ['guarded', ['secret', 'hide', "won't say"]],
    ['truthful', ['truth', 'honest', 'tell them', 'explain']]
  ]
};

// Literal route words are a cheap first pass before the classifier. The parser
// is deliberately simple; ambiguous matches fall back to route buttons.
export function explicitDirection(text) {
  const haystack = text.toLowerCase();
  const patterns = {
    north: /\bnorth\b|\bgraycap(?: range)?\b|\bnorthern mountain(?:s)?\b/,
    northwest: /\bnorthwest\b|north[ -]+west|\bgiant.?s pass\b|\bhigh pass\b|\bfrost giant\b/,
    east: /\beast\b|\bbirchway\b|\brimewood\b|\bsupply road\b|\beastern road\b/,
    south: /\bsouth\b|\bmammoth grounds?\b|\btundra\b|\bmammoth herd\b/,
    southwest: /\bsouthwest\b|south[ -]+west|\bdirewolf wood\b|\bdirewolf pack\b/
  };
  const found = Object.entries(patterns)
    .filter(([, pattern]) => pattern.test(haystack))
    .map(([route]) => route);
  return found.length === 1
    ? { route: found[0], ambiguous: false }
    : { route: null, ambiguous: found.length > 1 };
}

// Human-readable labels for the manual fallback chips.
export const LABEL_TEXT = {
  strong: 'Strong',
  quick: 'Quick',
  enduring: 'Enduring',
  observant: 'Observant',
  cunning: 'Cunning',
  healer: 'Healer',
  tracker: 'Tracker',
  leader: 'Leader',
  other: 'Something else',
  prepare: 'Prepare',
  ask_for_help: 'Ask for help',
  leave_quickly: 'Leave quickly',
  attack: 'Attack',
  evade: 'Evade',
  use_environment: 'Use the terrain',
  use_gear: 'Use gear',
  negotiate: 'Negotiate',
  retreat: 'Retreat',
  endure: 'Endure',
  mend: 'Mend a wound',
  careful: 'Careful',
  bold: 'Bold',
  clever: 'Clever',
  keep: 'Keep',
  consume: 'Consume',
  offer: 'Offer',
  destroy: 'Destroy',
  leave: 'Leave',
  harvest: 'Harvest',
  truthful: 'Truthful',
  boastful: 'Boastful',
  guarded: 'Guarded',
  apologetic: 'Apologetic',
  unclear: 'Not sure',
  north: 'North',
  northwest: 'Northwest',
  east: 'East',
  south: 'South',
  southwest: 'Southwest'
};

export const FIELD_LABELS = {
  specialty: 'Specialty',
  approach: 'Approach',
  direction: 'Route',
  beat: 'Approach to the encounter',
  tactic: 'Tactic',
  essence: 'Essence',
  carcass: 'Remains',
  stance: 'Manner'
};
