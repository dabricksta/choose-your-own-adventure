# The Initiate’s Hunt

A single-setting, browser-only interactive fiction prototype set in the Frostmarch. You describe what your hunter
does in your own words; a classifier maps that intent onto a small closed set of labels, and deterministic JavaScript
resolves the consequences.

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
| `src/content.js` | Routes, encounters, label sets, provider presets, display text |
| `src/state.js` | Seeded RNG, state defaults/validation, save and migration |
| `src/classify.js` | Demo keyword classifier, explicit-direction parser, provider adapters |
| `src/ui.js` | DOM rendering: transcript, forms, stats, manual fallback panel |
| `src/game.js` | Game flow, combat resolution, loot, audience, endings |
| `src/main.js` | Boot, provider settings, save/replay controls |
| `serve.py` | No-cache local development server |
| `frostmarch-realm-map.svg` | Hand-authored realm map |
| `initiates-hunt-prototype.html` | Redirect kept for old bookmarks |
| `ROADMAP.md` | Current gaps and the next iterations |

---

## How a run works

1. **Character creation** — describe your gender and specialty in your own words.
2. **Departure** — say how you prepare; this sets gear charges and whether a companion joins.
3. **Route** — name one of the five mapped trails from Keld.
4. **Encounter** — hear the scene and the faction conflict behind it.
5. **Fight** — describe a tactic each round. Attack, evade, use terrain, use gear, negotiate, or retreat.
6. **Loot** — decide what happens to the essence and the remains.
7. **Return** — the village reacts; choose who hears your account and how you tell it.
8. **Ending** — the account is judged against what you actually brought home.

Intelligent opponents (Goliaths, Frost Giants, White Dragonborn) can be parleyed with on the first attempt. A parley
ends the fight, earns faction standing and reputation, but yields no body, meat, or essence. That is the trade.

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

Route content lives in `DIRECTIONS` in `src/content.js`. A route needs a name, region, species, monster, kind,
vitality, threat, essences, a conflict paragraph, and a scene paragraph. Add the route label to the prompt/fallback
sets if you introduce a new direction name.

### Changing the rules

All consequences are in `src/game.js`: `resolveCombat`, `resolveLoot`, `resolveStartReturn`, and `resolveTalk`. The
classifier only returns labels; it cannot change numbers.

### Debugging

The page exposes a deliberately small console surface:

```js
__frostmarch.debug()        // { state, phase, logLength }
__frostmarch.begin(seed)    // start a specific seed
__frostmarch.saveProgress() // force a save
```

### Manual test checklist

There is no automated suite yet. The current smoke path:

1. Complete a run in Local demo: create a character, prepare, choose a route, win, keep loot, address the elder, tell the truth.
2. Parley with an intelligent opponent: verify no loot, +1 reputation, and faction standing.
3. Retreat and collapse: verify the return narration and that collapse restores 1 health.
4. Save and reload at each phase; confirm the prompt, stats, transcript, and draft return.
5. Make a provider request with no key or an unreachable endpoint; confirm the manual fallback panel appears.
6. Submit an ambiguous direction (“not south, but east”); confirm the route buttons appear.
7. Load a `v1` save; confirm state migration and the notice.

### Known limitations

- The explicit-direction regex is literal and does not understand negation. Ambiguity falls back to buttons, but a
  single misread route word can still win.
- Demo keyword classification is intentionally shallow. Hosted models classify freeform intent better.
- Only one encounter per run; there is no multi-scene route, village hub, or cross-run progression yet.
- `enduring`, `healer`, and `leader` specialties have no mechanical combat perk yet.
- No automated tests; no i18n; no content warnings beyond the setting description.

---

## Deploying

The project is static. For GitHub Pages, publish the repository root; `index.html` is the entry point and all module
paths are relative. The map and styles load from the same folder.

---

## Status

Prototype, second iteration. See [ROADMAP.md](ROADMAP.md) for the prioritized next steps.
