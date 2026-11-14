# Changelog

## v0.3 — depth slice

### Added

- **Approach beat before every encounter.** Each route gains an authored scene with three consequences:
  `careful` (first opening; intelligent factions remember that you respected their claim), `bold` (the foe starts
  wounded, you take a knock, and blood is drawn), `clever` (an extra essence type in the loot pool). The seed picks
  one of two scene variants per route.
- **Specialty moves.** `enduring` gets `endure` (brace once per fight; the next wound is absorbed) and `healer` gets
  `mend` (recover 1 health and clear an injury mid-fight). The extra tactic label is added to the closed label set
  only for the matching specialty, including the manual fallback chips.
- **Faction standing as a rule, not a display.** Killing an intelligent opponent lowers that faction's standing.
  Parley after blood has been drawn now requires standing ≥ 1. The return narration and the ending react to positive
  and negative standing.
- **Browser smoke suite** at `tests/smoke.html` / `tests/smoke.js`: 12 tests driving the real game in an iframe in
  demo mode (victory, parley, refused parley, standing-gated parley, retreat, collapse, `endure`, `mend`, clever
  essence, beat save/reload, faction audience line, disclosure alignment).
- `CHANGELOG.md`.

### Changed

- The provider panel is collapsed by default and shows the active provider in its summary.
- The three disclosures (`Save & replay`, map, provider) now share one left edge and marker position. The provider's
  inner padding and border box were the cause of the misalignment.
- `styles.css` is dedented to normal CSS indentation.
- Save state grows `beat: { variant, choice }` and combat flags `bloodDrawn` / `braced`; old saves still normalize.

### Fixed

- The demo classifier now maps “ask a hunter to come with me” to `ask_for_help`, so the companion mechanic engages.
  Found by the smoke suite.

---

## v0.2 — rules and structure

### Added

- Split the prototype into `index.html`, `styles.css`, and `src/` modules.
- Save format v2 with structured transcript logs and validation; v1 saves migrate with state preserved.
- Parley, collapse, gear, essence/inventory, and faction standing as real state.
- Manual classifier fallback panel with label chips, Continue, and Retry; ambiguous routes offer route buttons.
- Classifier timeouts, label sanitization, and JSON extraction that tolerates code fences.
- No-cache dev server (`serve.py`), README, roadmap, and a redirect from the old filename.

### Fixed

- Essence handling: keeping an essence now adds it to the pack; consume/offer/destroy/leave are distinct.
- Harvest works for humanoid remains; return narration matches what was actually taken.
- Collapse restores 1 health instead of ending at 0/3.
- `[hidden]` is respected despite component display rules.
- Demo classifier uses whole-word matching (“meat” no longer matches `eat`).
