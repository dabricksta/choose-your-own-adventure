// DOM rendering for the engine. It draws the transcript, prompts, choices,
// stats rows, and the manual classifier fallback. It knows nothing about any
// particular story: labels and stat rows arrive from the story module.

import { LOG_CLASSES } from './engine/transcript.js';

export const transcriptEl = document.querySelector('#transcript');
export const composer = document.querySelector('#composer');
export const statsEl = document.querySelector('#stats');
export const seedEl = document.querySelector('#run-seed');
export const saveNote = document.querySelector('#save-note');
export const resumeBtn = document.querySelector('#resume-run');

let saveHandler = () => {};
let scheduleHandler = () => {};
let labelMap = {};
let fieldLabels = {};

export function configure({ labelText = {}, fields = {} } = {}) {
  labelMap = labelText || {};
  fieldLabels = fields || {};
}

export function setPersistence({ save, schedule }) {
  if (typeof save === 'function') saveHandler = save;
  if (typeof schedule === 'function') scheduleHandler = schedule;
}

export function safe(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

export function fail(error) {
  return error?.message || 'Could not read that action. Check the provider settings and retry.';
}

function defaultLabelText(label) {
  return String(label).replaceAll('_', ' ').replace(/^\w/, character => character.toUpperCase());
}

function labelText(label) {
  return labelMap[label] || defaultLabelText(label);
}

function renderEntry(entry) {
  if (entry.kind === 'hr') {
    transcriptEl.appendChild(document.createElement('hr'));
    return;
  }
  const paragraph = document.createElement('p');
  paragraph.className = LOG_CLASSES.has(entry.cls) ? entry.cls : 'scene';
  paragraph.textContent = entry.text;
  transcriptEl.appendChild(paragraph);
}

// Attach the DOM to a transcript model. Returns an unsubscribe function.
export function bindTranscript(transcript) {
  return transcript.subscribe((type, payload) => {
    if (type === 'append') {
      renderEntry(payload);
    } else if (type === 'replace') {
      transcriptEl.innerHTML = '';
      for (const entry of payload) renderEntry(entry);
    }
  });
}

export function status(message) {
  const element = document.querySelector('.status');
  if (element) element.textContent = message;
}

export function setSaveNote(message) {
  if (saveNote) saveNote.textContent = message;
}

export function setResumeEnabled(enabled) {
  if (resumeBtn) resumeBtn.disabled = !enabled;
}

export function setSeed(value) {
  if (seedEl) seedEl.value = value || '';
}

export function answerElement() {
  return document.querySelector('#answer');
}

export function answerValue() {
  return answerElement()?.value || '';
}

// rows: [[label, value], ...] chosen by the story.
export function renderStats(rows) {
  statsEl.hidden = false;
  statsEl.innerHTML = rows
    .map(([label, value]) => `<span>${safe(label)}: ${safe(value)}</span>`)
    .join('');
}

export function hideStats() {
  statsEl.hidden = true;
}

export function form(label, placeholder, submitText, handler) {
  clearFallback();
  composer.innerHTML = `<label class="label" for="answer">${safe(label)}</label>
    <textarea id="answer" placeholder="${safe(placeholder)}"></textarea>
    <div class="row"><button class="primary" id="go" type="button">${safe(submitText)}</button></div>
    <div class="status" aria-live="polite"></div>`;
  const input = composer.querySelector('#answer');
  const go = composer.querySelector('#go');
  go.onclick = handler;
  input.addEventListener('input', scheduleHandler);
  input.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      go.click();
    }
  });
  saveHandler();
  input.focus();
}

export function choices(label, items, handler) {
  clearFallback();
  composer.innerHTML = `<span class="label">${safe(label)}</span>
    <div class="row">${items.map(([id, text]) => `<button type="button" data-id="${safe(id)}">${safe(text)}</button>`).join('')}</div>`;
  composer.querySelectorAll('button').forEach(button => {
    button.onclick = () => handler(button.dataset.id);
  });
  saveHandler();
  composer.querySelector('button')?.focus();
}

export function singleButton(label, handler) {
  clearFallback();
  composer.innerHTML = `<button class="primary" id="restart" type="button">${safe(label)}</button>`;
  const button = composer.querySelector('#restart');
  button.onclick = handler;
  saveHandler();
  button.focus();
}

export function lockStep(busyText = 'Reading your action…') {
  const input = document.querySelector('#answer');
  const go = document.querySelector('#go');
  if (go) go.disabled = true;
  if (input) input.disabled = true;
  status(busyText);
}

export function unlockStep() {
  const input = document.querySelector('#answer');
  const go = document.querySelector('#go');
  if (go) go.disabled = false;
  if (input) {
    input.disabled = false;
    input.focus();
  }
}

export function clearFallback() {
  composer.querySelector('.fallback')?.remove();
}

export function renderFallback(step, note, defaults, retry) {
  clearFallback();
  const selected = { ...defaults };
  const groups = Object.entries(step.fields).map(([field, labels]) => {
    const chips = labels.map(label => {
      const active = selected[field] === label ? ' active' : '';
      return `<button type="button" class="chip${active}" data-field="${safe(field)}" data-label="${safe(label)}">${safe(labelText(label))}</button>`;
    }).join('');
    return `<div class="fallback-group"><span class="label">${safe(fieldLabels[field] || field)}</span><div class="row">${chips}</div></div>`;
  }).join('');

  const box = document.createElement('div');
  box.className = 'fallback';
  box.innerHTML = `<p class="fallback-note">${safe(note || 'The model could not read that reliably. Choose the closest reading, then continue — or retry the model.')}</p>
    ${groups}
    <div class="row fallback-actions"><button type="button" class="primary" id="fallback-continue">Continue</button><button type="button" id="fallback-retry">Retry classifier</button></div>`;
  composer.appendChild(box);

  box.querySelectorAll('.chip').forEach(button => {
    button.addEventListener('click', () => {
      selected[button.dataset.field] = button.dataset.label;
      box.querySelectorAll('.chip').forEach(other => {
        if (other.dataset.field === button.dataset.field) {
          other.classList.toggle('active', other.dataset.label === button.dataset.label);
        }
      });
    });
  });

  box.querySelector('#fallback-retry').addEventListener('click', () => {
    const input = document.querySelector('#answer');
    if (input && input.value.trim()) step.text = input.value.trim();
    clearFallback();
    retry(step);
  });

  box.querySelector('#fallback-continue').addEventListener('click', () => {
    const input = document.querySelector('#answer');
    const text = input && input.value.trim() ? input.value.trim() : step.text;
    clearFallback();
    if (input) input.disabled = true;
    const go = document.querySelector('#go');
    if (go) go.disabled = true;
    try {
      step.apply({ ...selected }, text);
    } catch (error) {
      console.error(error);
      status(fail(error));
      unlockStep();
    }
  });

  box.querySelector('#fallback-continue').focus();
}
