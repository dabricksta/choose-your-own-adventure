// Save envelopes are story-agnostic: the engine owns the version, seed, log
// and draft, while the story supplies its own state shape and migrations.
//
// A story module provides:
//   save.key      localStorage key for the current format
//   save.version  current numeric version
//   save.legacy   [{ key, version, migrate(rawState) -> state }]
//   phases        accepted phase ids
//   normalizeState(raw) -> state

import { LOG_CLASSES, MAX_LOG_ENTRIES } from './transcript.js';
import { randomSeed, seedHash } from './rng.js';

export function baseState(seed) {
  const value = String(seed || randomSeed());
  return { seed: value, rngState: seedHash(value) };
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

function makeSnapshot(story, { state, phase, log, draft }) {
  return {
    version: story.save.version,
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

function isRestorable(story, value) {
  return !!value
    && value.version === story.save.version
    && value.state
    && typeof value.state === 'object'
    && story.phases.includes(value.phase)
    && Array.isArray(value.log);
}

export function readSave(story) {
  const current = readJson(story.save.key);
  if (isRestorable(story, current)) {
    return { ...current, log: sanitizeLog(current.log) };
  }

  for (const legacy of story.save.legacy || []) {
    const value = readJson(legacy.key);
    if (value && value.version === legacy.version && value.state && story.phases.includes(value.phase)) {
      return {
        version: story.save.version,
        migratedFrom: legacy.version,
        state: legacy.migrate(value.state),
        phase: value.phase,
        log: [],
        draft: typeof value.draft === 'string' ? value.draft.slice(0, 5000) : ''
      };
    }
  }

  return null;
}

export function writeSave(story, snapshot) {
  try {
    localStorage.setItem(story.save.key, JSON.stringify(makeSnapshot(story, snapshot)));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
