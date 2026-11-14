// Entry point: provider settings, save/replay controls, and boot.

import { PROVIDER_PRESETS } from './content.js';
import { readSave, randomSeed } from './state.js';
import {
  seedEl,
  setPersistence,
  setResumeEnabled,
  setSaveNote
} from './ui.js';
import {
  begin,
  restoreProgress,
  saveProgress,
  scheduleSave,
  debugInfo
} from './game.js';

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

document.querySelector('#save-now').onclick = saveProgress;

document.querySelector('#resume-run').onclick = () => {
  if (!restoreProgress()) {
    setSaveNote('No saved run is available in this browser.');
  }
};

document.querySelector('#replay-seed').onclick = () => {
  const requested = seedEl.value.trim();
  const current = debugInfo().state?.seed;
  begin(requested || current || randomSeed());
};

document.querySelector('#new-run').onclick = () => begin(randomSeed());

setPersistence({ save: saveProgress, schedule: scheduleSave });
setResumeEnabled(!!readSave());

if (!restoreProgress()) {
  begin(randomSeed());
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveProgress();
});
window.addEventListener('pagehide', saveProgress);

// Small debug surface for the browser console and for smoke checks.
// It exposes no keys and performs no network calls by itself.
window.__frostmarch = {
  debug: debugInfo,
  begin,
  restoreProgress,
  saveProgress
};
