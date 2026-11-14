# Roadmap

The prototype’s core bet is sound: **treat freeform language as intent, then resolve outcomes with deterministic rules.**
The next iterations should deepen that bet rather than replace it with prose generation.

Current state: second iteration (`v0.2`), single-encounter arc, five fixed routes, one deterministic combat system,
local demo classifier plus six hosted/typed adapters.

---

## Shipped in v0.2

### Correctness

- Reworked the loot/essence model into `essencesFound`, `essenceOutcome`, `inventory`, and explicit loot flags.
  Keeping an essence now actually puts it in the pack; consuming, offering, destroying, and leaving all have distinct
  outcomes and text.
- Harvest now works for both wild and humanoid remains, and every carcass branch sets the return narration correctly.
- Parley is a real alternative: the first successful negotiation against an intelligent opponent ends the encounter,
  grants +1 reputation and faction standing, and yields no body or essence.
- Collapse is a distinct outcome. The rescue restores 1 health instead of leaving the run at `0/3`, and the ending
  acknowledges the recovery.
- Faction standing and the pack are visible in the stats line.
- The demo classifier now matches whole words, fixing false positives such as “meat” matching `eat`.

### Robustness

- Save format `v2` stores a validated, structured transcript log instead of raw HTML, closing the stored-XSS surface
  and making saves smaller.
- Saves are schema-checked on read; corrupt or unknown-phase saves fall back to a new run rather than half-restoring.
- `v1` saves migrate: state is preserved, old transcript HTML is intentionally dropped.
- Draft saving is debounced (300 ms), with immediate saves on prompts and a flush on page hide.
- Restore is wrapped in `try/finally`, so a failure cannot leave autosave permanently disabled.
- Classifier requests use `AbortController` with a 45-second timeout and clear network/CORS error messages.
- Every adapter validates returned labels against the allowed set. JSON extraction tolerates code fences and stray prose.
- On classifier failure, the player gets a manual reading panel: per-field label chips, a Continue button, and Retry.
- Ambiguous route descriptions produce route buttons instead of a dead end.
- `[hidden]` is respected despite component display rules (the key/endpoint fields and empty stats are actually hidden).

### Structure

- Split the monolith into `index.html`, `styles.css`, and `src/` modules: `content`, `state`, `classify`, `ui`, `game`,
  `main`.
- Added `serve.py` with caching disabled, because ES modules require HTTP.
- Added `README.md`, this roadmap, a `file://` warning, and an `index.html` entry point. The old prototype filename is a
  redirect for existing bookmarks.
- Exposed a small `__frostmarch` debug surface for smoke checks.

---

## Design invariants to preserve

1. **No model-authored consequences.** Models return labels only. Numbers, inventory, and endings are local.
2. **Every label set is closed and validated.** Unknown values degrade to `other`/`unclear`, never crash.
3. **The player can always continue.** Provider failure, ambiguity, or malformed JSON must offer a manual path.
4. **Saves are data, not markup.** Render transcripts from structured entries.
5. **A seed repeats rolls, not classifications.** Keep that distinction visible in the UI.
6. **Keys stay in memory.** No provider settings in saves, no key carried across provider switches.
7. **Authored prose stays authored.** Do not replace the scene text with generated prose; generate texture only if a
   separate, opt-in layer is ever added.

---

## Known gaps

### High value

| Gap | Why it matters | Suggested fix |
| --- | --- | --- |
| No automated tests | Every rules change is a manual regression risk | Node-free browser test page or a small Vitest/Playwright setup; start with pure state, demo classifier, and combat matrices |
| Only one encounter per run | The arc resolves too quickly and routes feel like skins | Two to three beats per route: approach/tracking, complication, encounter |
| Three specialties have no perk | `enduring`, `healer`, `leader` are labels without mechanics | Give each a move: pressure reduction, a recovery round, a mid-fight recruit |
| Faction standing is display-only | Parley’s reward does not change later play | Gate audience lines, encounter variants, and parley difficulty on standing |
| Gear dominates preparation | Two 2-damage openers can end most fights | Give speed/ally/social trade-offs, or make gear situational |
| Direction parser ignores negation | “I don’t go south” routes south | Prefer the classifier when negation is present, or always show the route confirmation for regex matches |
| Provider panel is always open | Pushes the story below the fold on mobile | Collapse by default and put current provider name in the summary |

### Medium value

- No run export/share. A seed alone is not a recap.
- No journal or cross-run history.
- No cost/latency indicator and no classification cache.
- No retry policy beyond the manual panel; one bounded retry for malformed JSON would help.
- Prompt labels are bare snake_case words; per-label descriptions would reduce drift.
- Model IDs and availability need verification per provider; expose a freeform field and a “list models” helper.
- No content note for hunting violence.
- No `prefers-reduced-motion` concern yet (there are no animations), but focus management on long transcripts is basic.
- `trim`/cap of the transcript log is 600 entries; no “export full run” path.
- No localization; curly quotes and English-only prose are baked in.

### Long-term

- The single-file-esque app has no build pipeline, type checking, or linting.
- No backend. Hosted-provider CORS and key handling are the user’s problem.
- No telemetry or playtest instrumentation (deliberately, but useful in an opt-in form).

---

## v0.3 — Depth

Goal: make each route feel like a short story rather than a single gate, and make every build choice matter.

### Content and structure

- **Beat-based routes.** Each direction defines 2–3 ordered beats with variants selected by seed and approach:
  - travel/tracking beat (learn something, spend time, gain position),
  - complication (weather, rival, wounded animal, evidence),
  - encounter,
  - optional aftermath.
- **Route-specific objectives.** Not every hunt is “kill the monster.” Examples: recover sled goods, drive off a
  delver without a body, secure a mineral sample, leave the herd intact, rescue a missing trapper.
- **Authored encounter variants** selected by faction standing and prior beat outcomes.
- **Ending variants** keyed to outcome, loot, stance, audience, and faction standing. At least one ending per route
  that is not simply “victory.”

### Rules

- **Specialty moves** (one per specialty):
  - `enduring` — ignore the first pressure threshold once per fight.
  - `healer` — spend a round to remove a wound or convert pressure into recovery.
  - `leader` — call in aid once, even without a companion, at a social cost.
  - `observant` — reveal the foe’s next pressure and cancel exposure.
  - `quick` — act first when exposed.
  - `strong` — break terrain/grapple instead of only bonus attack damage.
- **Injuries with teeth.** Named injuries impose a specific penalty (reduced gear, worse negotiation, slower travel)
  and clear at the village.
- **Typed essences.** Consuming fire/shadow/regrowth has distinct effects and risks. Offering moves faction standing.
  Keeping enables later crafting or trade.
- **Negotiation depth.** Terms can include tribute, withdrawal, information, or a promise. Success depends on foe,
  standing, companion, and whether blood has been drawn.
- **Preparation trade-offs.** Speed grants first-strike/position; ally grants help but costs social capital; gear is
  finite and heavy.

### Engineering

- Extract a pure `resolveCombatAction(state, tactic)` and table-driven tests for every tactic/threat/specialty matrix.
- Add a content schema check at boot (route fields, label arrays, preset shapes).
- Add a browser smoke-test page that drives the game in demo mode through each outcome.
- Add structured run history (`runId`, seed, outcome, route, choices) without changing the active save format.
- Add an export/import run JSON action.

---

## v0.4 — World

Goal: make Keld a place that remembers.

- **Village hub between hunts**: stores, healer, elders, rival, hunt board, rumors, relationship state.
- **Cross-run progression**: reputation, faction standing, unlocked routes, injuries carried into the next hunt,
  crafted gear from kept essences.
- **Reactive factions**: Goliath/Giant/Dragonborn standing changes parley options, encounter composition, and audience
  reactions.
- **Multiple hunters**: companion identity, loyalty, and a small party system.
- **Season/weather**: time pressure, migration, snow, and scarcity alter route difficulty.
- **Journal**: per-run and per-character history; shareable recap page from a seed plus a compact choice log.
- **Optional proxy**: a tiny Cloudflare Worker or Node service to hold keys and normalize provider CORS. Demo mode
  remains fully local.

---

## v1.0 — Product quality

- Automated unit + integration + browser tests in CI.
- Accessibility pass: Lighthouse, focus order, live-region tuning, keyboard-only run, high-contrast check.
- Content schema, migrations, and versioned save compatibility policy.
- Performance budget; transcript virtualization only if runs get long.
- Deployment pipeline to GitHub Pages (or a static host) with cache headers and a version stamp.
- Playtesting instrumentation behind an explicit opt-in.

---

## Non-goals for now

- Freeform model-written prose as the main story layer.
- Multiplayer or a server-authoritative game loop.
- A general-purpose RPG engine or mod platform.
- Procedural map generation; the fixed Frostmarch map is an asset, not a limitation.
- Storing API keys in the browser profile for convenience.

---

## Recommended next slice

If only one more increment fits:

1. Add a browser smoke test that covers all four outcomes (victory, parley, retreat, collapse) and a save/reload.
2. Add one second beat to each route, selected deterministically.
3. Implement two specialty moves (`enduring`, `healer`) as proof that the label set can carry mechanics.
4. Make faction standing change one audience line and one parley condition.
5. Collapse the provider panel by default and show the active provider in its summary.

That is enough to prove the depth direction without expanding the world or adding a backend.
