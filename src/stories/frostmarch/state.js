// Frostmarch state shape, validation, and the v1 -> v2 migration.
// Pure state only: no DOM, no flow.

import { baseState } from '../../engine/save.js';
import { clamp, hasOwn, stringList, text, toInt } from '../../engine/util.js';
import {
  BEAT_ACTIONS,
  DIRECTIONS,
  MONSTER_KINDS,
  OUTCOMES,
  SPECIALTIES
} from './content.js';

export function blankState(seed) {
  return {
    ...baseState(seed),
    gender: '',
    specialtyText: '',
    specialty: 'observant',
    direction: null,
    monster: null,
    monsterKind: null,
    beat: { variant: 0, choice: null },
    health: 3,
    maxHealth: 3,
    injuries: [],
    gear: 0,
    essencesFound: [],
    essenceOutcome: null,
    inventory: { essences: [], materials: [] },
    reputation: 0,
    audience: null,
    defeated: false,
    outcome: null,
    conflictFocus: null,
    encounter: null,
    mutation: null,
    combat: null,
    companion: false,
    factionStanding: {},
    loot: { materialsTaken: false, meatTaken: false, hideTaken: false }
  };
}

function normalizeOutcome(value) {
  if (!value || typeof value !== 'object') return null;
  const disposition = ['keep', 'consume', 'offer', 'destroy', 'leave', 'other'].includes(value.disposition)
    ? value.disposition
    : 'other';
  return { disposition, types: stringList(value.types, 20) };
}

function normalizeCombat(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    foeHP: clamp(toInt(value.foeHP, 1), 0, 99),
    pressure: clamp(toInt(value.pressure, 0), 0, 99),
    rounds: clamp(toInt(value.rounds, 0), 0, 999),
    exposed: !!value.exposed,
    allyHelpUsed: !!value.allyHelpUsed,
    negotiated: !!value.negotiated,
    bloodDrawn: !!value.bloodDrawn,
    braced: !!value.braced
  };
}

function normalizeStanding(value) {
  const standing = {};
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, amount] of Object.entries(value)) {
      if (Number.isFinite(amount)) standing[String(key).slice(0, 60)] = clamp(Math.trunc(amount), -99, 99);
    }
  }
  return standing;
}

function normalizeEncounter(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    name: text(value.name, 20),
    region: text(value.region, 80),
    species: text(value.species, 80),
    monster: text(value.monster, 120),
    kind: MONSTER_KINDS.includes(value.kind) ? value.kind : null,
    vitality: clamp(toInt(value.vitality, 1), 1, 20),
    threat: clamp(toInt(value.threat, 1), 0, 10),
    essences: stringList(value.essences, 20),
    conflict: text(value.conflict, 2000),
    scene: text(value.scene, 4000),
    mutation: text(value.mutation, 40) || null
  };
}

export function normalizeState(input) {
  const source = input && typeof input === 'object' ? input : {};
  const seed = typeof source.seed === 'string' && source.seed ? source.seed.slice(0, 200) : baseState().seed;
  const seeded = baseState(seed);
  return {
    ...seeded,
    rngState: Number.isFinite(source.rngState) ? source.rngState >>> 0 : seeded.rngState,
    gender: text(source.gender, 200),
    specialtyText: text(source.specialtyText, 500),
    specialty: SPECIALTIES.includes(source.specialty) ? source.specialty : 'other',
    direction: hasOwn(DIRECTIONS, source.direction) ? source.direction : null,
    monster: text(source.monster, 120) || null,
    monsterKind: MONSTER_KINDS.includes(source.monsterKind) ? source.monsterKind : null,
    health: clamp(toInt(source.health, 3), 0, 3),
    maxHealth: 3,
    injuries: stringList(source.injuries, 20),
    gear: clamp(toInt(source.gear, 0), 0, 5),
    essencesFound: stringList(source.essencesFound, 20),
    essenceOutcome: normalizeOutcome(source.essenceOutcome),
    inventory: {
      essences: stringList(source.inventory?.essences, 50),
      materials: stringList(source.inventory?.materials, 50)
    },
    reputation: clamp(toInt(source.reputation, 0), 0, 999),
    audience: text(source.audience, 120) || null,
    defeated: !!source.defeated,
    outcome: OUTCOMES.includes(source.outcome) ? source.outcome : null,
    conflictFocus: text(source.conflictFocus, 120) || null,
    encounter: normalizeEncounter(source.encounter),
    mutation: text(source.mutation, 40) || null,
    beat: {
      variant: clamp(toInt(source.beat?.variant, 0), 0, 9),
      choice: BEAT_ACTIONS.includes(source.beat?.choice) ? source.beat.choice : null
    },
    combat: normalizeCombat(source.combat),
    companion: !!source.companion,
    factionStanding: normalizeStanding(source.factionStanding),
    loot: {
      materialsTaken: !!source.loot?.materialsTaken,
      meatTaken: !!source.loot?.meatTaken,
      hideTaken: !!source.loot?.hideTaken
    }
  };
}

// Version 1 stored a display string in `essence`, a type list in `essences`,
// and loose booleans in `loot`. Map those into the current model.
export function migrateState(legacyState) {
  const legacy = legacyState && typeof legacyState === 'object' ? legacyState : {};
  const state = normalizeState(legacy);
  if (!state.essencesFound.length) {
    if (Array.isArray(legacy.essences)) state.essencesFound = stringList(legacy.essences, 20);
    else if (Array.isArray(legacy.encounter?.essences)) state.essencesFound = stringList(legacy.encounter.essences, 20);
  }
  if (!state.essenceOutcome && typeof legacy.essenceDisposition === 'string') {
    state.essenceOutcome = { disposition: legacy.essenceDisposition, types: state.essencesFound.slice() };
  }
  if (legacy.loot?.essenceOffered) state.essenceOutcome = { disposition: 'offer', types: state.essencesFound.slice() };
  if (legacy.loot?.essenceConsumed) state.essenceOutcome = { disposition: 'consume', types: state.essencesFound.slice() };
  state.outcome = state.outcome || (legacy.defeated ? 'victory' : (state.health === 0 ? 'collapse' : null));
  state.loot = {
    materialsTaken: !!(legacy.loot && (legacy.loot.materialsTaken || legacy.loot.meatTaken || legacy.loot.hideTaken)),
    meatTaken: !!legacy.loot?.meatTaken,
    hideTaken: !!legacy.loot?.hideTaken
  };
  return state;
}
