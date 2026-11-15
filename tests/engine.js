// Engine-level tests. These use tests/fixture-story.js, not Frostmarch, to
// prove the session driver is story-agnostic. Open /tests/engine.html.

import { createClassifier } from '../src/engine/classify.js';
import { readSave } from '../src/engine/save.js';
import { createSession } from '../src/engine/session.js';
import * as ui from '../src/ui.js';
import story from './fixture-story.js';

const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function until(predicate, label, timeout = 4000) {
  const start = performance.now();
  for (;;) {
    try {
      if (predicate()) return;
    } catch {
      // Mid-render; keep polling.
    }
    if (performance.now() - start > timeout) throw new Error(`Timed out waiting for ${label}.`);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

function input() {
  return document.querySelector('#answer');
}

async function submit(text) {
  const field = input();
  if (!field) throw new Error(`No prompt. Composer reads: ${document.querySelector('#composer').innerText}`);
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#go').click();
  await new Promise(resolve => setTimeout(resolve, 40));
}

async function click(selector) {
  const button = document.querySelector(selector);
  if (!button) throw new Error(`No element ${selector}.`);
  button.click();
  await new Promise(resolve => setTimeout(resolve, 40));
}

function test(name, run) {
  return { name, run };
}

const tests = [
  test('boots a story that is not Frostmarch', async () => {
    assert(story.id === 'fixture', `story id was ${story.id}.`);
    session.begin('engine-seed');
    assert(session.phase === 'name', `phase was ${session.phase}.`);
    assert(session.transcript.entries.some(entry => entry.text?.includes('bare stage')), 'intro was not logged.');
    assert(document.querySelector('#stats').hidden, 'stats should be hidden on the first phase.');
  }),

  test('renders a text prompt and advances', async () => {
    await submit('raven');
    assert(session.phase === 'mood', `phase was ${session.phase}.`);
    assert(session.state.token === 'raven', `token was ${session.state.token}.`);
    assert(!document.querySelector('#stats').hidden, 'stats should be visible after the first phase.');
    assert(document.querySelector('#stats').innerText.includes('token: raven'), 'stats did not show the token.');
  }),

  test('falls back to story labels when the model fails', async () => {
    await submit('quiet');
    assert(session.phase === 'mood', 'a failed classification should not advance the phase.');
    assert(document.querySelector('.fallback'), 'no fallback panel was rendered.');
    const chips = [...document.querySelectorAll('.fallback .chip')].map(chip => chip.textContent);
    assert(chips.includes('Calm') && chips.includes('Bold'), `chips were ${chips.join(', ')}.`);
    await click('#fallback-continue');
    assert(session.phase === 'pick', `phase after fallback was ${session.phase}.`);
    assert(session.state.mood === 'calm', `mood was ${session.state.mood}.`);
  }),

  test('renders story choices and reaches the end', async () => {
    await click('#composer [data-id="left"]');
    assert(session.phase === 'end', `phase was ${session.phase}.`);
    assert(session.state.pick === 'left', `pick was ${session.state.pick}.`);
    assert(document.querySelector('#restart'), 'the end button was not rendered.');
  }),

  test('saves and restores the fixture state', async () => {
    session.save();
    const saved = readSave(story);
    assert(saved, 'no save was written.');
    assert(saved.state.token === 'raven', `saved token was ${saved.state.token}.`);
    assert(saved.phase === 'end', `saved phase was ${saved.phase}.`);

    session.destroy();
    const restored = createSession({
      story,
      ui,
      classifier: createClassifier({ getConfig: () => ({ provider: 'demo' }), rules: story.demoRules })
    });
    ui.setPersistence({ save: restored.save, schedule: restored.scheduleSave });
    assert(restored.restore(), 'restore returned false.');
    assert(restored.phase === 'end', `restored phase was ${restored.phase}.`);
    assert(restored.state.token === 'raven', `restored token was ${restored.state.token}.`);
    assert(restored.transcript.length > 0, 'the transcript was not restored.');
    restored.destroy();
  })
];

let classifierCalls = 0;
const classifier = {
  async run() {
    classifierCalls += 1;
    if (classifierCalls === 1) throw Error('Fixture provider failure.');
    return { mood: 'calm' };
  },
  demo(text) {
    return { mood: /loud|rush|bold/i.test(text) ? 'bold' : 'calm' };
  }
};

ui.configure({ labelText: story.labelText, fields: story.fieldLabels });
localStorage.removeItem(story.save.key);

const session = createSession({ story, ui, classifier });
ui.setPersistence({ save: session.save, schedule: session.scheduleSave });
session.begin('engine-seed');

const list = document.querySelector('#results');
for (const { name, run } of tests) {
  try {
    await run();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message || String(error) });
  }
}

const failed = results.filter(result => !result.ok).length;
list.innerHTML = `<h2>${results.length - failed} passed, ${failed} failed</h2>
  <ol>${results.map(result => `<li class="${result.ok ? 'pass' : 'fail'}">${result.name}${result.ok ? '' : ` — ${result.error}`}</li>`).join('')}</ol>`;
document.title = `${failed ? 'FAIL' : 'PASS'} — engine tests`;
window.__engineTests = { total: results.length, passed: results.length - failed, failed, results };
