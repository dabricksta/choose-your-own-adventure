// The session driver: phase entry, classification steps, persistence.
//
// A story module supplies the phases and their hooks. This module supplies the
// medium around them: seeded time, transcript, prompts, fallback chips, saves,
// and restore. Consequences always stay in the story's resolve code.

import { createTranscript } from './transcript.js';
import { randomSeed, nextRandom } from './rng.js';
import { readSave, writeSave } from './save.js';

export function createSession({ story, ui, classifier }) {
  if (!story?.steps) throw Error('A story module with steps is required.');
  if (!classifier?.run) throw Error('A classifier is required.');

  const transcript = createTranscript();
  const unbindTranscript = ui.bindTranscript(transcript);

  let state = null;
  let phase = null;
  let restoring = false;
  let saveTimer = null;

  function say(text, cls) {
    transcript.say(text, cls);
  }

  function divider() {
    transcript.divider();
  }

  function player(text) {
    say(`“${text}”`, 'scene player');
  }

  function stats() {
    const rows = typeof story.stats === 'function' ? story.stats(state, phase) : null;
    if (rows && rows.length) ui.renderStats(rows);
    else ui.hideStats();
  }

  function form(label, placeholder, submitText, handler) {
    ui.form(label, placeholder, submitText, handler);
  }

  function choices(label, items, handler) {
    ui.choices(label, items, handler);
  }

  function status(message) {
    ui.status(message);
  }

  function endButton(label, handler) {
    ui.singleButton(label, handler);
  }

  function answer() {
    return ui.answerValue().trim();
  }

  function random() {
    return nextRandom(state);
  }

  function offerFallback(step, note) {
    ui.renderFallback(
      step,
      note,
      classifier.demo(step.text, step.fields),
      nextStep => classified(nextStep)
    );
  }

  async function classified(step) {
    ui.clearFallback();
    if (!step.text) {
      status(step.emptyText || 'Write a response first.');
      return;
    }
    ui.lockStep(step.busyText || 'Reading your action…');
    let labels;
    try {
      labels = await classifier.run(step.text, step.fields, step.context);
    } catch (error) {
      console.error(error);
      status(ui.fail(error));
      ui.unlockStep();
      offerFallback(step, step.fallbackNote);
      return;
    }
    try {
      step.apply(labels, step.text);
    } catch (error) {
      console.error(error);
      status(ui.fail(error));
      ui.unlockStep();
    }
  }

  function enter(phaseId, options = {}) {
    const step = story.steps[phaseId];
    if (!step) throw Error(`Story "${story.id}" has no step for phase "${phaseId}".`);
    phase = phaseId;
    // The stat bar belongs to the medium: it reflects the state at every phase
    // boundary. Stories can still refresh it mid-phase after an effect.
    stats();
    step.enter(session, { restoring: !!options.restoring });
  }

  function begin(seed) {
    state = story.blankState(String(seed || randomSeed()));
    phase = story.start;
    ui.setSeed(state.seed);
    transcript.clear();
    stats();
    if (typeof story.intro === 'function') story.intro(session);
    enter(story.start);
    scheduleSave();
  }

  function save() {
    if (restoring || !state) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    const result = writeSave(story, {
      state,
      phase,
      log: transcript.entries,
      draft: ui.answerValue()
    });
    if (result.ok) {
      ui.setSaveNote(story.saveNote || 'Saved on this device.');
      ui.setResumeEnabled(true);
    } else {
      ui.setSaveNote('This browser could not save locally. Keep this tab open to continue.');
    }
  }

  function scheduleSave() {
    if (restoring || !state) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 300);
  }

  function restore() {
    const saved = readSave(story);
    if (!saved) return false;

    restoring = true;
    try {
      state = story.normalizeState(saved.state);
      phase = saved.phase;
      transcript.load(saved.log);
      ui.setSeed(state.seed || '');
      stats();
      enter(saved.phase, { restoring: true });
      const input = ui.answerElement();
      if (input) input.value = saved.draft || '';
    } catch (error) {
      console.error(error);
      ui.setSaveNote('The saved run could not be read. Starting a new run.');
      return false;
    } finally {
      restoring = false;
    }

    save();
    if (saved.migratedFrom) {
      ui.setSaveNote('Loaded a save from the previous prototype. Earlier transcript text was not restored; future saves use the new format.');
    }
    return true;
  }

  function debug() {
    return { state, phase, logLength: transcript.length };
  }

  const session = {
    get state() { return state; },
    get phase() { return phase; },
    get restoring() { return restoring; },
    get story() { return story; },
    transcript,
    answer,
    random,
    stats,
    say,
    player,
    divider,
    form,
    choices,
    status,
    endButton,
    offerFallback,
    classified,
    enter,
    begin,
    restore,
    save,
    scheduleSave,
    debug,
    unlock: () => ui.unlockStep(),
    destroy: () => unbindTranscript()
  };

  return session;
}
