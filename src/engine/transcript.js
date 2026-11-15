// The transcript is the durable record of a run: the entries the UI draws and
// the entries a save file stores. It has no DOM dependency. The UI subscribes
// and renders; the engine only appends.

export const MAX_LOG_ENTRIES = 600;
export const LOG_CLASSES = new Set(['scene', 'scene player', 'annotation', 'bridge', 'end']);

export function createTranscript() {
  const entries = [];
  const listeners = new Set();

  function emit(type, payload) {
    for (const listener of listeners) listener(type, payload);
  }

  function append(entry) {
    entries.push(entry);
    if (entries.length > MAX_LOG_ENTRIES) entries.splice(0, entries.length - MAX_LOG_ENTRIES);
    emit('append', entry);
  }

  return {
    get entries() { return entries; },
    get length() { return entries.length; },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    say(text, cls = 'scene') {
      append({
        kind: 'say',
        text: String(text ?? ''),
        cls: LOG_CLASSES.has(cls) ? cls : 'scene'
      });
    },

    divider() {
      append({ kind: 'hr' });
    },

    clear() {
      entries.length = 0;
      emit('replace', entries);
    },

    // Used when restoring a save: replace the whole log at once.
    load(list) {
      entries.length = 0;
      entries.push(...list);
      emit('replace', entries);
    }
  };
}
