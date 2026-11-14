// Session state, seeded randomness, validation, and save/load.
// This module is deliberately free of DOM and game-flow code.

import {
  SAVE_KEY,
  LEGACY_SAVE_KEY,
  SAVE_VERSION,
  MAX_LOG_ENTRIES,
  SPECIALTIES,
  MONSTER_KINDS,
  OUTCOMES,
  PHASES,
  LOG_CLASSES,
  DIRECTIONS
} from './content.js';

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const toInt = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
};
const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
const stringList = (value, limit) => Array.isArray(value)
  ? value.filter(item => typeof item === 'string').slice(0, limit)
  : [];

export function seedHash(seed) {
  let hash = 2166136261;
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

export function randomSeed() {
  try {
    return [...crypto.getRandomValues(new Uint32Array(2))]
      .map(number => number.toString(36))
      .join('');
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function nextRandom(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

export function blankState(seed) {
  seed = String(seed || randomSeed());
  return {
    seed,
    rngState: seedHash(seed),
    gender: '',
    specialtyText: '',
    specialty: 'observant',
    direction: null,
    monster: null,
    monsterKind: null,
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
    negotiated: !!value.negotiated
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
  const seed = typeof source.seed === 'string' && source.seed ? source.seed.slice(0, 200) : randomSeed();
  return {
    seed,
    rngState: Number.isFinite(source.rngState) ? source.rngState >>> 0 : seedHash(seed),
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

export function sanitizeLog(entries) {
  if (!Array.isArray(entries)) return [];
  const clean = [];
  for (const entry of entries.slice(-MAX_LOG_ENTRIES)) {
    if (!entry || typeof entry !== 'object') continue;
    if (entry.kind === 'hr') {
      clean.push({ kind: 'hr' });
      continue;
    }
    if (entry.kind === 'say' && typeof entry.text === 'string') {
      clean.push({
        kind: 'say',
        text: entry.text.slice(0, 20000),
        cls: LOG_CLASSES.has(entry.cls) ? entry.cls : 'scene'
      });
    }
  }
  return clean;
}

export function makeSnapshot(state, phase, log, draft) {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    state,
    phase,
    log: sanitizeLog(log),
    draft: String(draft || '').slice(0, 5000)
  };
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function isRestorable(value) {
  return !!value
    && value.version === SAVE_VERSION
    && value.state
    && typeof value.state === 'object'
    && PHASES.has(value.phase)
    && Array.isArray(value.log);
}

export function readSave() {
  const current = readJson(SAVE_KEY);
  if (isRestorable(current)) {
    return { ...current, log: sanitizeLog(current.log) };
  }

  const legacy = readJson(LEGACY_SAVE_KEY);
  if (legacy && legacy.version === 1 && legacy.state && PHASES.has(legacy.phase)) {
    return {
      version: SAVE_VERSION,
      migratedFrom: 1,
      state: migrateState(legacy.state),
      phase: legacy.phase,
      log: [],
      draft: typeof legacy.draft === 'string' ? legacy.draft.slice(0, 5000) : ''
    };
  }

  return null;
}

export function writeSave(state, phase, log, draft) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(makeSnapshot(state, phase, log, draft)));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
