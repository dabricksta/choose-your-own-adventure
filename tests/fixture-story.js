// A deliberately tiny story used only by tests/engine.html.
//
// It is not a setting. It exists to prove that src/engine runs a story module
// with no knowledge of Frostmarch, and to exercise the medium's seams:
// text prompts, classified prompts with the manual fallback, choices, stats,
// persistence, and the end button.

import { baseState } from '../src/engine/save.js';

const PHASES = ['name', 'mood', 'pick', 'end'];

function blankState(seed) {
  return { ...baseState(seed), token: '', mood: null, pick: null };
}

function normalizeState(raw) {
  const state = blankState(raw?.seed);
  return {
    ...state,
    token: typeof raw?.token === 'string' ? raw.token.slice(0, 100) : '',
    mood: typeof raw?.mood === 'string' ? raw.mood : null,
    pick: typeof raw?.pick === 'string' ? raw.pick : null
  };
}

export default {
  id: 'fixture',
  title: 'Engine fixture',
  start: 'name',
  phases: PHASES,

  save: { key: 'engine-fixture-save', version: 1, legacy: [] },
  saveNote: 'Fixture save.',

  demoRules: {
    mood: [
      ['calm', ['calm', 'quiet', 'still']],
      ['bold', ['bold', 'loud', 'rush']]
    ]
  },
  labelText: { calm: 'Calm', bold: 'Bold' },
  fieldLabels: { mood: 'Mood' },

  blankState,
  normalizeState,

  stats(state, phase) {
    if (phase === 'name') return null;
    return [
      ['token', state.token || 'none'],
      ['mood', state.mood || 'none'],
      ['pick', state.pick || 'none']
    ];
  },

  intro(session) {
    session.say('A bare stage with three prompts.');
  },

  steps: {
    name: {
      enter(session) {
        session.form('Name a token.', 'Any word…', 'Set it', () => {
          session.state.token = session.answer() || 'unnamed';
          session.enter('mood');
        });
      }
    },

    mood: {
      enter(session) {
        session.form('Describe a mood.', 'Say calm or bold…', 'Say it', () => {
          session.classified({
            text: session.answer(),
            emptyText: 'Say something.',
            fields: { mood: ['calm', 'bold'] },
            context: 'Engine fixture. Classify a mood.',
            fallbackNote: 'Choose a mood.',
            apply: ({ mood }, spoken) => {
              session.player(spoken);
              session.state.mood = mood;
              session.enter('pick');
            }
          });
        });
      }
    },

    pick: {
      enter(session) {
        session.choices('Pick a side.', [
          ['left', 'Left'],
          ['right', 'Right']
        ], id => {
          session.state.pick = id;
          session.enter('end');
        });
      }
    },

    end: {
      enter(session) {
        session.endButton('Run again', () => session.begin());
      }
    }
  }
};
