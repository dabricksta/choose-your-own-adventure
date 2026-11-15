// Entry point: choose a story, wire the provider panel and save controls, boot.
//
// The engine lives in src/engine and knows no setting. This story is one
// module in src/stories. Point the import below at another story folder with
// the same exports to run a different world on the same medium.

import { createClassifier } from './engine/classify.js';
import { PROVIDER_PRESETS } from './engine/providers.js';
import { readSave } from './engine/save.js';
import { createSession } from './engine/session.js';
import * as ui from './ui.js';
import story from './stories/frostmarch/index.js';

const providerEl = document.querySelector('#provider');
const modelEl = document.querySelector('#model');
const endpointEl = document.querySelector('#endpoint');
const keyEl = document.querySelector('#api-key');
const providerName = document.querySelector('#provider-name');
const providerHelp = document.querySelector('#provider-help');
const providerStatus = document.querySelector('#provider-status');

function applyProviderPreset() {
  const preset = PROVIDER_PRESETS[providerEl.value];
  if (!preset) return;
  modelEl.value = preset.model;
  endpointEl.value = preset.endpoint;
  const hide = ['demo', 'claude-app'].includes(providerEl.value);
  document.querySelector('#key-wrap').hidden = hide;
  document.querySelector('#endpoint-wrap').hidden = hide;
  providerHelp.textContent = preset.help;
  providerStatus.textContent = '';
  if (providerName) providerName.textContent = providerEl.selectedOptions[0]?.textContent || providerEl.value;
  keyEl.placeholder = providerEl.value === 'local'
    ? 'Optional for local servers; kept for this tab only'
    : 'Enter key; kept for this tab only';
}

providerEl.addEventListener('change', () => {
  // Never carry a key from one provider to another by accident.
  keyEl.value = '';
  applyProviderPreset();
});
applyProviderPreset();

const classifier = createClassifier({
  getConfig: () => ({
    provider: providerEl.value,
    model: modelEl.value,
    endpoint: endpointEl.value,
    key: keyEl.value
  }),
  rules: story.demoRules
});

ui.configure({ labelText: story.labelText, fields: story.fieldLabels });

const session = createSession({ story, ui, classifier });

ui.setPersistence({
  save: () => session.save(),
  schedule: () => session.scheduleSave()
});
ui.setResumeEnabled(!!readSave(story));

document.querySelector('#save-now').onclick = () => session.save();

document.querySelector('#resume-run').onclick = () => {
  if (!session.restore()) {
    ui.setSaveNote('No saved run is available in this browser.');
  }
};

document.querySelector('#replay-seed').onclick = () => {
  const requested = ui.seedEl.value.trim();
  const current = session.debug().state?.seed;
  session.begin(requested || current);
};

document.querySelector('#new-run').onclick = () => session.begin();

if (!session.restore()) {
  session.begin();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') session.save();
});
window.addEventListener('pagehide', () => session.save());

// Small debug surface for the browser console and for smoke checks.
// It exposes no keys and performs no network calls by itself.
window.__frostmarch = {
  story: story.id,
  debug: () => session.debug(),
  begin: seed => session.begin(seed),
  restoreProgress: () => session.restore(),
  saveProgress: () => session.save()
};
