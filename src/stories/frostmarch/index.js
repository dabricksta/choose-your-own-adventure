// The Frostmarch story package: metadata, state, presentation rows, and the
// phase hooks. Point main.js at a different folder with the same exports to
// run a different story on the same engine.

import { DEMO_RULES, FIELD_LABELS, LABEL_TEXT, PHASES } from './content.js';
import { blankState, migrateState, normalizeState } from './state.js';
import { steps } from './steps.js';

const SAVE_NOTE = 'Saved on this device. Seed repeats random mutation rolls; model classifications may vary. API keys are never saved.';

const DISPOSITIONS = {
  keep: 'kept',
  consume: 'consumed',
  offer: 'offered',
  destroy: 'destroyed',
  leave: 'left',
  other: 'unresolved'
};

// Presentation is story data: the engine renders these rows generically.
export function stats(state, phase) {
  if (!state || phase === 'gender' || phase === 'specialty') return null;

  const essence = state.essenceOutcome
    ? `${DISPOSITIONS[state.essenceOutcome.disposition] || state.essenceOutcome.disposition}${state.essenceOutcome.types.length ? ` (${state.essenceOutcome.types.join(', ')})` : ''}`
    : 'none';
  const rows = [
    ['specialty', state.specialty],
    ['health', `${state.health}/3`],
    ['injuries', state.injuries.length ? state.injuries.join(', ') : 'none'],
    ['gear', state.gear],
    ['essence', essence],
    ['reputation', state.reputation]
  ];

  const factions = Object.entries(state.factionStanding || {})
    .filter(([, amount]) => amount)
    .map(([name, amount]) => `${name} ${amount > 0 ? '+' : ''}${amount}`)
    .join(', ');
  if (factions) rows.push(['factions', factions]);

  const pack = [...state.inventory.essences, ...state.inventory.materials].join(', ');
  if (pack) rows.push(['pack', pack]);

  return rows;
}

const frostmarch = {
  id: 'frostmarch',
  title: 'The Initiate’s Hunt',
  start: 'gender',
  phases: PHASES,

  save: {
    key: 'frostmarch-hunt-save-v2',
    version: 2,
    legacy: [
      { key: 'frostmarch-hunt-save-v1', version: 1, migrate: migrateState }
    ]
  },
  saveNote: SAVE_NOTE,

  demoRules: DEMO_RULES,
  labelText: LABEL_TEXT,
  fieldLabels: FIELD_LABELS,

  blankState,
  normalizeState,
  stats,

  intro(session) {
    session.say('The winter stores are low in Keld, a human village at the Rime Ford in the Frostmarch. Before you leave to hunt, the hearth-keeper asks who you are becoming.');
  },

  steps
};

export default frostmarch;
