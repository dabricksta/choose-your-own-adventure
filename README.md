# The Initiate’s Hunt

A single-setting, browser-only interactive fiction prototype set in the Frostmarch. You describe what your hunter
does in your own words; a classifier maps that intent onto a small closed set of labels, and deterministic JavaScript
resolves the consequences.

The code is split in two: `src/engine/` is a story-agnostic medium (phases, prompts, classifier adapters, saves,
seeded randomness, transcript), and `src/stories/frostmarch/` is one pluggable story module. The engine never imports
a setting; a story never touches the DOM.

The design rule is deliberate:

> **The model classifies. The game rules resolve.** The model never writes prose, invents facts, or decides success.

That keeps runs reproducible from a seed, makes outcomes debuggable, and means the demo mode can run entirely offline.

---

## Quick start

The game uses ES modules, so it needs to be served over HTTP. From the project folder:

```sh
python serve.py
```

Then open <http://127.0.0.1:8000/>.

Any static server works too, for example:

```sh
python -m http.server 8000
```

Opening `index.html` directly with `file://` is blocked by browser module security; the page shows a warning if you try.

No dependencies, no build step, no package manager required.

---

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html` | Page shell: masthead, map, provider panel, transcript, composer |
| `styles.css` | Paper-and-ink theme, dark mode, fallback controls |
| `src/engine/session.js` | Phase driver, prompts, classified steps, save/restore |
| `src/engine/transcript.js` | Durable log model; the UI subscribes and draws |
| `src/engine/save.js` | Save envelope, seed, log sanitising, legacy migrations |
| `src/engine/classify.js` | Provider adapters and the generic demo keyword classifier |
| `src/engine/providers.js` | Provider presets |
| `src/engine/rng.js` | Seeded randomness |
| `src/engine/util.js` | Small pure helpers |
| `src/stories/frostmarch/content.js` | Routes, encounters, label sets, demo keywords, display text |
| `src/stories/frostmarch/state.js` | Frostmarch state shape, validation, v1 migration |
| `src/stories/frostmarch/steps.js` | Every Frostmarch phase hook and consequence |
| `src/stories/frostmarch/index.js` | The story module the engine loads |
| `src/stories/README.md` | The story-module contract |
| `src/ui.js` | DOM rendering: transcript, forms, stats rows, manual fallback panel |
| `src/main.js` | Boot, provider settings, save/replay controls, active story import |
| `tests/smoke.html` | Browser smoke suite that drives the real Frostmarch game in an iframe |
| `tests/engine.html` | Engine suite driving a fixture story that is not Frostmarch |
| `serve.py` | No-cache local development server |
| `frostmarch-realm-map.svg` | Hand-authored realm map |
| `initiates-hunt-prototype.html` | Redirect kept for old bookmarks |
| `ROADMAP.md` | Current gaps and the next iterations |
| `CHANGELOG.md` | What changed in each iteration |

---

## How a run works

1. **Character creation** — describe your gender and specialty in your own words.
2. **Departure** — say how you prepare; this sets gear charges and whether a companion joins.
3. **Route** — name one of the five mapped trails from Keld.
4. **Approach** — a short beat before the fight. Watch, rush, or use the moment; each route has
   authored consequences and the seed picks one of two scene variants.
5. **Encounter** — hear the scene and the faction conflict behind it.
6. **Fight** — describe a tactic each round. Attack, evade, use terrain, use gear, negotiate, or retreat.
7. **Loot** — decide what happens to the essence and the remains.
8. **Return** — the village reacts; choose who hears your account and how you tell it.
9. **Ending** — the account is judged against what you actually brought home.

Intelligent opponents (Goliaths, Frost Giants, White Dragonborn) can be parleyed with. A parley ends the fight,
earns faction standing and reputation, but yields no body, meat, or essence. That is the trade.

Standing cuts both ways. Killing an intelligent opponent lowers that faction's standing, and once blood has been
drawn only a faction that already respects you (standing ≥ 1) will still hear terms. The approach beat is one way
to earn that respect before steel is out.

Two specialties carry a combat move of their own:

- **Enduring** — `endure`. Brace once per fight. The next blow that would wound you is spent on your guard instead.
- **Healer** — `mend`. Bind a wound mid-fight: recover 1 health and clear one injury while the foe closes.

The move appears as an extra tactic label only for the matching specialty, and the manual fallback panel offers
the same labels.

### Engine and stories

The medium and the setting are separate on disk and in imports:

- **`src/engine/`** owns the phase machine, prompt rendering, the classifier
  seam, seeded randomness, save envelopes, log sanitising, and restore. It has no
  setting text and no story imports.
- **`src/stories/frostmarch/`** owns the routes, scenes, label sets, state shape,
  and every consequence. It has no DOM access and no provider code.
- **`src/ui.js`** draws what the engine gives it: transcript entries, prompts,
  choices, and `[[label, value], ...]` stat rows chosen by the story.

A story is a folder with an `index.js`, `content.js`, `state.js`, and `steps.js`.
Swapping it is one import in `src/main.js`. The full contract, including the
`session` API and classified-step shape, is in
[`src/stories/README.md`](src/stories/README.md).

`tests/engine.html` runs a five-phase fixture story with no Frostmarch imports,
which is the practical check that the boundary has not leaked.

### Controls

- Type in the textarea and press the submit button.
- `Ctrl+Enter` / `Cmd+Enter` submits without reaching for the mouse.
- Choice screens and the manual fallback panel are keyboard-focusable.

---

## Providers and privacy

| Provider | What it does |
| --- | --- |
| **Local demo** | Keyword rules in the page. No network, no key, no text leaves the browser. |
| **Claude in-app** | Uses the host app’s Claude integration when available. |
| **Claude API** | Calls Anthropic directly with your key. |
| **OpenAI API** | Calls OpenAI chat completions with your key. |
| **Qwen API** | Calls DashScope’s OpenAI-compatible endpoint. |
| **Local OpenAI-compatible** | Ollama, LM Studio, or any compatible endpoint. |
| **Jev classifier** | Uses Jev’s typed choice API. |

- API keys are kept **in memory for this tab only**. They are never written to `localStorage` or the save file.
- Switching providers clears the key field so it cannot be sent to the wrong service.
- Hosted providers receive the scene context and your action text in the classification prompt. Demo mode does not.
- Direct browser calls depend on each provider’s CORS policy. A local model endpoint is the most reliable hosted setup.
- Requests time out after 45 seconds. On failure, the game shows a manual reading panel with retry and label choices
  instead of dead-ending.

The prompt treats the player action as data, not instructions, and every adapter validates the returned label against
the allowed set before the rules engine sees it.

---

## Saves, seeds, and replay

- The run, transcript, and current draft auto-save to `localStorage` under `frostmarch-hunt-save-v2`.
- Saves are debounced while typing and validated on restore. Unknown or corrupt saves fall back to a new run.
- Saves from the original prototype (`v1`) are migrated: state is preserved, but the old transcript HTML is not restored.
- The seed repeats **random mutation rolls only**. Model classifications can vary between runs.
- Save files contain no API keys and no provider settings.
- “Start / replay this seed” starts a fresh run with the seed in the field.
- “Save now” forces an immediate write; “Resume saved run” restores the last save.

---

## Development notes

### Adding a route

Route content lives in `DIRECTIONS` in `src/stories/frostmarch/content.js`. A route needs a name, region, species,
monster, kind, vitality, threat, essences, a conflict paragraph, a scene paragraph, and a beat. Add the route label to
the prompt/fallback sets if you introduce a new direction name.

### Changing the rules

All Frostmarch consequences are in `src/stories/frostmarch/steps.js`: `resolveBeat`, `resolveCombat`, `resolveLoot`,
`startReturn`, and `resolveTalk`. The classifier only returns labels; it cannot change numbers.

### Adding a story

Copy `src/stories/frostmarch/`, replace its content/state/steps, and change the import in `src/main.js`. Keep
`src/engine/` untouched. See [`src/stories/README.md`](src/stories/README.md) for the module and session contracts.

### Debugging

The page exposes a deliberately small console surface:

```js
__frostmarch.debug()        // { state, phase, logLength }
__frostmarch.begin(seed)    // start a specific seed
__frostmarch.saveProgress() // force a save
```

### Test checklist

The browser suites are the first line of defense:

```sh
python serve.py
```

Then open:

- <http://127.0.0.1:8000/tests/smoke.html> — 12 story-level tests that drive the real game in an iframe and assert
  on outcomes, loot, faction standing, specialty moves, save restore, and disclosure alignment. The title should read
  `PASS — smoke tests`.
- <http://127.0.0.1:8000/tests/engine.html> — 5 engine-level tests that boot a fixture story with no Frostmarch
  imports and exercise prompts, the manual fallback, choices, stats, and save/restore. The title should read
  `PASS — engine tests`. One logged provider error is expected: that test deliberately fails the classifier once.

Both suites play real runs in the page while they work, but the smoke suite snapshots your save file first and
restores it afterwards. Avoid running them in the same browser profile as a run you care about.

They are not wired into CI (there is no build step or package manager). Before a release, also check by hand:

1. A full run in Local demo with each route.
2. A hosted provider with a real key, and a failing provider to confirm the manual fallback panel.
3. An ambiguous direction (“not south, but east”) — the route buttons should appear.
4. A `v1` save, to confirm migration still works.

### Known limitations

- The explicit-direction regex is literal and does not understand negation. Ambiguity falls back to buttons, but a
  single misread route word can still win.
- Demo keyword classification is intentionally shallow. Hosted models classify freeform intent better.
- Only one encounter per run. The approach beat adds a scene, not a second encounter chain.
- `leader` still has no mechanical perk. `enduring` and `healer` do.
- Faction standing persists only inside a run’s save; there is no cross-run ledger yet.
- The engine suites are browser-driven and hand-started; there is no CI and no unit-test runner.
- The page shell (`index.html`) still carries Frostmarch masthead copy and the fixed realm map, so a second story
  needs a small shell change or a story switcher.
- No i18n; no content warnings beyond the setting description.

---

## Deploying

The project is static. For GitHub Pages, publish the repository root; `index.html` is the entry point and all module
paths are relative. The map and styles load from the same folder.

---

## Status

Prototype, fourth iteration. See [ROADMAP.md](ROADMAP.md) for the prioritized next steps and
[CHANGELOG.md](CHANGELOG.md) for what changed.
