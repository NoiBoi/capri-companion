# Stage 5 handoff

Stage 4 is implemented and installed in Capri 0.9.0.

Working checkout: `C:\Users\matth\Documents\Codex\2026-10-25\i-x20\outputs\Capri`.
Normal launcher: `C:\Users\matth\OneDrive\Desktop\Capri Buddy.lnk`.
The final normal launch preserved 40 approved memories and the saved name, reported
Codex connected, and loaded without settings repairs. A complete stopped-profile
backup and original 0.8.0 rollback application are in the Stage 4 task's
`work/stage4-release` directory. These contain private profile data; do not publish them.

Validation: 675 unit tests; 23 final packaged checks; 3 real Chrome extraction checks;
1 real MV3 transport fixture. Read STAGE4_VALIDATION.md for selected-test scope,
failed first attempts and known limits.

 Begin with STAGE4.md, STAGE4_VALIDATION.md,
the architecture/status documents and docs/DIALOGUE_GUIDE.md. The user's next
Stage 5 specification controls its scope. Do not invent Stage 5 requirements.

Preserve the established checkout and all preexisting Stage 1/2/3 local changes.
The normal profile remains Documents/Capri Buddy through profileDirectory, not
the historical AppData-only path. Keep encrypted credentials, approved memories,
Honcho deletion state, native delivery history, character assets and action policies
in their existing owners. Do not add a competing optional scheduler.

## Main paths

- main/life/perception.ts: bounded structured page schema, hash/relevance policy,
  typed world projections, provenance status and investigation admission.
- main/life/context.ts: same durable Life checkpoint, bounded snapshots, relevant
  retrieval, native user reports, queue lifecycle, deadline horizon, coalescing.
- main/life/chrome.ts and extensions/chrome: paired receiver and permissioned DOM
  reading. Retain the extension directory and token. No auth is needed for fixtures.
- main/behavior/core.ts: the sole optional model decision owner, semantic saturation
  and admission of all actual bundled source dependencies.
- main/index.ts: native availability cues, existing heartbeat, capture preflight,
  actual delivery and source/privacy invalidation.

## Reproduce

Run typecheck, npm test -- --maxWorkers=2, build and the focused Electron fixtures.
perception.e2e exercises SQLite restart, source revocation and availability offline.
semanticExtraction.e2e exercises real DOM extraction in isolated headless Chrome.
CAPRI_CHROME_EXE overrides its browser path. chromeExtension.e2e tests real MV3
transport when CAPRI_CHROMIUM_EXE points to an executable supporting extension flags.
Do not confuse DOM extraction checks with a verified live MV3 upgrade.

Package with npm run dist. Set CAPRI_EXE to the staged unpacked executable and run
Electron suites serially. Follow the existing stopped-profile backup and rollback
release procedure before replacing the portable application. Verify the normal
Desktop shortcut and actual runtime profile after replacement.

## Boundaries for subsequent work

No direct Gradescope API is implemented. Manual imports and direct user reports
remain user evidence; email notices are source claims. The canonical projection
fixture for an authoritative submission is a contract test, not proof of a live
integration. Do not turn these into verified completion by adding a prompt.

Playback is sampled element state, never cumulative watching time. Process presence
does not prove gaming or a call. Authorized voice membership can defer attention,
but does not establish speech or the user's intent. Every inferred cue must yield
to explicit interaction.

Page snapshots are content-sensitive local data and follow source/history retention.
Keep revocation atomic with the ledger. Retrieval remains bounded and source-linked;
native user reports must not be tainted with unrelated external dependencies.
Keep current corrections and application quotes above historical interpretations.

Saturation phases are operational state, not claims of understanding. The native
same-title fallback deliberately favors silence; future semantic comparison may
improve that without reinstating pixel-change novelty or continuous reasoning.
The existing native Escape-focus limitation is carried forward in validation.
