# Story modules

A story is a folder under `src/stories/` plus one import in `src/main.js`. The
engine in `src/engine/` never imports a story, and a story never touches the DOM
or the provider panel. That boundary is the point: the medium is reusable, and
each world is data plus rules.

```
src/engine/            the medium (no setting)
  session.js           phase driver, prompts, classified steps, save/restore
  transcript.js        durable log model; the UI subscribes and draws
  save.js              save envelope, seed, log sanitising, migrations
  classify.js          provider adapters + generic demo keyword classifier
  providers.js         provider presets
  rng.js               seeded randomness
  util.js              clamp/toInt/text/stringList/addUnique

src/stories/frostmarch/   one story
  content.js           routes, scenes, label sets, demo keywords, display text
  state.js             state shape, validation, legacy migration
  steps.js             every phase hook and every consequence
  index.js             the module the engine loads
```

## The module contract

`src/stories/<name>/index.js` default-exports an object with these fields.

| Field | Meaning |
| --- | --- |
| `id` | Stable short id, used in error messages and debug output. |
| `title` | Human-readable title. |
| `start` | Phase id to enter for a new run. |
| `phases` | Array of every phase id the story can save or restore. |
| `save` | `{ key, version, legacy: [{ key, version, migrate(raw) }] }`. |
| `saveNote` | Text shown after a successful save. |
| `demoRules` | Keyword rules for `demoClassify`, keyed by field name. |
| `labelText` | Display text for every closed label, for fallback chips. |
| `fieldLabels` | Display text for each classified field. |
| `blankState(seed)` | New state object. Spread `baseState(seed)` from `engine/save.js` to get `seed` and `rngState`. |
| `normalizeState(raw)` | Validate/clamp a saved state. Must be total: never throw on junk. |
| `stats(state, phase)` | Rows `[[label, value], ...]`, or `null`/`[]` to hide the stat bar. |
| `intro(session)` | Optional narration at the start of a new run. |
| `steps` | Map of phase id → step. Every phase in `phases` needs one. |

## The step contract

```js
steps: {
  somePhase: {
    enter(session, { restoring }) {
      // 1. Optionally narrate. Skip narration when `restoring` is true; the
      //    transcript from the save is already on screen.
      // 2. Render exactly one prompt: form(), choices(), or endButton().
    }
  }
}
```

`session` is the engine API:

| Call | What it does |
| --- | --- |
| `session.state` | Mutable state object for this run. |
| `session.phase` | Current phase id. |
| `session.answer()` | Trimmed textarea value. |
| `session.say(text, cls?)` | Append to the transcript. Classes: `scene`, `scene player`, `annotation`, `bridge`, `end`. |
| `session.player(text)` | Append the player's words as a quoted `scene player` line. |
| `session.divider()` | Append a horizontal rule. |
| `session.stats()` | Re-render the stat bar from this story's `stats()`. |
| `session.form(label, placeholder, submitText, handler)` | Render a freeform prompt. |
| `session.choices(label, [[id, text], ...], handler)` | Render a button choice screen. |
| `session.endButton(label, handler)` | Render a single terminal button. |
| `session.classified(step)` | Run the classifier and apply the result. See below. |
| `session.offerFallback(step, note)` | Show the manual label panel for a step whose classification was ambiguous. |
| `session.enter(phaseId, opts?)` | Move to another phase (the engine re-renders stats). |
| `session.begin(seed?)` | Start a fresh run. |
| `session.random()` | Next seeded random number in `[0, 1)`. |
| `session.status(text)` | Write a message under the current prompt. |
| `session.unlock()` | Re-enable a prompt after a failed/redirected action. |

### The classified step object

The model receives only `fields` and `context`; `apply` is local code that
receives validated labels.

```js
session.classified({
  text: session.answer(),
  emptyText: 'Write an action first.',
  busyText: 'Reading your action…',
  fields: { tactic: ['attack', 'evade', 'retreat', 'other'] },
  context: 'Encounter with a wolf. Terrain: pine scrub.',
  fallbackNote: 'Choose the tactic closest to what you described.',
  apply: ({ tactic }, spoken) => {
    session.player(spoken);
    // resolve consequences here
  }
});
```

Rules of the medium:

1. **Labels are closed.** Every value the model may return is listed in
   `fields`; `sanitizeLabels` drops anything else.
2. **The model never resolves.** `apply` is story code. It may be async-safe but
   should not await.
3. **Fallbacks are honest.** `demoRules` and `labelText` must cover the same
   labels the story offers, including specialty-only moves.
4. **Entrances are replayable.** `enter` must be able to rebuild the prompt from
   state alone when `restoring` is true. Narrate only when it is false.

## Adding a story

1. Copy `src/stories/frostmarch/` to `src/stories/<name>/`.
2. Replace `content.js`, `state.js`, and `steps.js`. Keep the exports in
   `index.js`.
3. Give it a new `save.key`; keep legacy migrations inside the module.
4. Change one import in `src/main.js`:
   ```js
   import story from './stories/<name>/index.js';
   ```
5. Run `tests/smoke.html` (story-level) and `tests/engine.html`
   (story-agnostic fixture) to confirm the medium still works.

Nothing else in `src/engine/`, `src/ui.js`, or `index.html` needs to change.
`index.html` currently carries Frostmarch copy in the masthead and map; move
that into the page shell if you add a story switcher.
