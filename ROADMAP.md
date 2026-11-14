# Roadmap

The prototype’s core bet is sound: **treat freeform language as intent, then resolve outcomes with deterministic rules.**
The next iterations should deepen that bet rather than replace it with prose generation.

Current state: third iteration (`v0.3`), single-encounter arc with an approach beat per route, five fixed routes,
one deterministic combat system, two specialty moves, local demo classifier plus six hosted/typed adapters, and a
browser smoke suite.

---

## Shipped in v0.3

### Depth

- **Approach beat per route.** Every route now has a short scene before the encounter with three authored
  consequences: *careful* (first opening, and factions remember that you respected their claim), *bold* (the foe
  starts wounded, but you take a knock and blood is drawn), *clever* (an extra essence type for the loot pool).
  The seed picks one of two authored scene variants per route.
- **Specialty moves.** `enduring` gains `endure` (brace once per fight; the next wound is spent on your guard) and
  `healer` gains `mend` (recover 1 health and clear one injury mid-fight). The extra tactic label is injected into
  the closed label set only for the matching specialty, so the classifier and the manual fallback both stay honest.
- **Faction standing has teeth.** Killing an intelligent opponent lowers that faction's standing. Once blood is
  drawn, parley only succeeds if standing ≥ 1 — so the careful beat can buy you a conversation you would otherwise
  have lost. The return narration and the ending both react to positive and negative standing.

### Testing

- `tests/smoke.html` + `tests/smoke.js`: 12 browser tests that drive the real game in an iframe in demo mode and
  assert on outcomes, loot, standing, specialty moves, save restore, and disclosure alignment. No framework, no
  build step. A deliberate mutation (forcing parley to always succeed) was used to confirm the suite fails.
- Fixed a demo-classifier miss found while writing the tests: “ask a hunter to come with me” now maps to
  `ask_for_help`, so the companion mechanic actually engages.

### Presentation

- The provider panel is collapsed by default and its summary shows the active provider.
- All three disclosures (`Save & replay`, map, provider) now share one left edge and marker position; the old
  inner padding/border box was removed.
- `styles.css` is dedented to normal CSS indentation.

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
| No unit tests | Rules changes are still guarded by a hand-started browser suite, not CI | Extract pure `resolveCombatAction(state, tactic, enemy)` and table-test the tactic/threat/specialty matrix |
| Only one encounter per run | The arc resolves after one beat and one fight; routes still share a shape | Add a second encounter or a fork on one route first, as a template |
| `leader` has no perk | One specialty is still a label without mechanics | Rally once per fight: negate pressure, owe a favour with a social cost |
| Gear dominates preparation | Two 2-damage openers can end most fights | Give speed/ally/social trade-offs, or make gear situational |
| Direction parser ignores negation | “I don’t go south” routes south | Prefer the classifier when negation is present, or always confirm regex matches |
| Standing does not persist across runs | The faction ledger resets with each new run | Cross-run ledger in local storage or a village hub |

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

## v0.4 — Depth, continued

Goal: make each route a short chain rather than one beat and one gate.

### Content and structure

- **A second encounter per route.** The v0.3 approach beat is the template: a scene, three authored consequences,
  then a state change. Add one more beat after the fight (aftermath/choice) or before it (tracking/complication).
  Prove the shape on one route before repeating it.
- **Route-specific objectives.** Not every hunt is “kill the monster”: recover sled goods, drive off a delver
  without a body, secure a mineral sample, leave the herd intact, rescue a missing trapper.
- **Authored encounter variants** selected by faction standing and prior beat outcomes.
- **Ending variants** keyed to outcome, loot, stance, audience, and faction standing. At least one ending per route
  that is not simply “victory.”

### Rules

- **The `leader` move** — the last specialty without one: rally once per fight, negate pressure this round, and
  record a favour owed that the ending mentions.
- **Write down the other perks.** `observant`, `quick`, `strong`, `cunning`, and `tracker` have effects implied by
  `skilledAttack` / `skilledTerrain`; make each an explicit named move or state it in the README.
- **Injuries with teeth.** Named injuries impose a specific penalty (reduced gear, worse negotiation, slower travel)
  and clear at the village.
- **Typed essences.** Consuming fire/shadow/regrowth has distinct effects and risks. Offering moves faction standing.
- **Negotiation depth.** Terms can include tribute, withdrawal, information, or a promise. Success depends on foe,
  standing, companion, and whether blood has been drawn.
- **Preparation trade-offs.** Speed grants first-strike/position; ally grants help but costs social capital; gear is
  finite and heavy.

### Engineering

- Extract a pure `resolveCombatAction(state, tactic, enemy)` and table-test the tactic/threat/specialty matrix. The
  browser smoke suite stays as the integration layer.
- Add a content schema check at boot (route fields, beat option effects, label arrays, preset shapes).
- Add structured run history (`runId`, seed, outcome, route, choices) without changing the active save format.
- Add an export/import run JSON action.

---

## v0.5 — World

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

1. Add one more beat to a single route (east is the simplest) so the chain shape is proven before repeating it.
2. Implement the `leader` move (`rally`) and assert it in the smoke suite.
3. Extract combat resolution into a pure function and add table tests for the tactic/threat/specialty matrix.
4. Make the direction parser negation-aware, or always confirm regex matches with the route buttons.
5. Add a non-lethal ending per route (drive off, recover the goods, leave the herd) keyed to the beat choice.
