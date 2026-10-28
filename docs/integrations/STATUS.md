# Stage 1 status: Capri 0.4.1

## 0.4.1 restart, quota and pose repair

- Connections text drafts (site list, display name, retention text, aliases and extension ID) now persist immediately in `life-setup-drafts.json`, independently of evidence retention. Incomplete text is recoverable after restart without granting access. `Save source controls` still explicitly applies validated sites and permissions. Previously typed text that never reached the main process cannot be recovered retroactively.
- Normal debounced setting edits flush on navigation, blur, close-button and Escape. Main-process settings reset also flushes before acknowledging completion. Disk round-trip coverage checks every normalized settings section, including nondefault text/numbers, arrays, nested policy records, toggles and position. Production-mode quit/relaunch coverage includes credentials, saved sites and unapplied drafts.
- Both teleport jump paths now release old pose attachments before the native move, as glide already did. Detach resets stale inversion state; valid new inverted perches remain available.
- Codex usage-limit wording is recognized as a quota failure even without HTTP 429. It enters the existing cooldown instead of appearing as a generic server/parsing failure, and explains that generated replies share the account's Codex allowance while local controls continue to work. No provider/account fallback or limit bypass was introduced.
- The installed CLI account matched the account used by this chat. One fresh real reply succeeded, recorded in `account-reconnection.json`. No login credentials were copied or replaced.
- The development builder keeps the previous runnable entry point while compiling, then publishes each bundle atomically with main last. This removes the temporary missing `dist/main/index.js` launch gap. An initial overlapping test/rebuild launch failed before this change; focused reruns passed in isolation.
- Interruption frequency, activity level, dialogue cadence and background budgets were left unchanged, per the user's latest instruction. Chrome installation/pairing and site permissions remain for the user to finish.
- TypeScript passed. Full unit regression: 59 files / 574 tests passed with sequential file execution and a 15s timeout for disk-heavy storage tests. Focused source restart/draft/pose checks: 5 passed. Packaged checks and deployed state are recorded after packaging below.

This file distinguishes implementation, verification and manual setup. It is the handoff for Calendar, Last.fm and OwnTracks work.

## Implemented

- Main-process Life Context source/event/entity/candidate contracts; bounded atomic JSON persistence, revisions/deduplication, tombstones, expiry, corrections and revocation.
- Shared bounded ContextAssembler in normal chat and BehaviorCore prompt paths, preserving native memories, Honcho, personality and existing movement/initiative behavior.
- Authenticated exact-Origin loopback bridge, encrypted app pairing secret, MV3 companion extension, independent optional-site grants and exact app allowlist, focused-page semantics, explicit one-time selected text/excerpts, navigation/content hints, freshness and reconnect backoff.
- Explicitly picked local project folders, bounded debounced watchers, file lifecycle metadata, Git branch/HEAD, canonical projects and aliases, optional changed-file excerpts, failure/backoff diagnostics.
- Connections interface for health, permissions, sites/folders, aliases, evidence, current understanding, corrections, candidates, pause/disconnect/forget/clear, retention and setup.
- Conservative learning boundary: no Life Context data or source-derived assistant exchange is exported to Honcho or learned into native profile/tastes/episodes. Saved Chat remains available to the user but excludes source-derived messages from automatic recall.
- Chrome extension and integration documentation included as ordinary package resources. Existing uncommitted changes were retained.

## Verified so far

- TypeScript passed after initial implementation.
- Original full unit suite: 58 files, 560 tests passed before adding the Stage 1 tests.
- Stage 1 unit tests: 11 passed, covering aliases, context budget, stale evidence, ordering/deletion/restart, corrections, revoke/pause, volatile retention, non-repetitive candidates, URL boundaries, authenticated bridge and actual filesystem changes.
- Focused Electron Stage 1: 3 passed. Verified Connections controls/evidence and semantic chat prompts, source-derived Chat flags, disconnect erasure from immediate/automatic context, direct-chat cancellation of in-flight optional speech, and an actual approved-folder watcher with pause and metadata-only behavior.

Additional verification:

- Full unit regression: 59 files, 571 tests passed.
- Broader source Electron regression: 37 passed, 2 skipped across 7 selected suites (Life Context, PersonalContext, Honcho, BehaviorCore, profile persistence, conversation scene, companion visits). The two skipped cases are existing platform/test-condition skips.
- Final focused Life Context Electron run: 5 passed, adding the actual extension extractor executed in Chromium DOM (hidden/form/editable/password exclusions), scrollable settings layout, and actual presence arbitration with delivered-candidate consumption and no duplicate callback.
- Exactly two real-model first attempts used the already configured Codex provider and synthetic evidence, with no real memories/history/source data copied. Direct chat expressed a concrete opinion about separating observation from action authorization. The optional decision chose silence because the point was already covered. Full first results, including that quiet result, are preserved in `live-dialogue-first.json`; no broad personality-quality claim is made from two samples.
- A real isolated MV3 browser test is available in `tests/e2e/chromeExtension.e2e.test.ts` with `CAPRI_CHROMIUM_EXE`. The cached Chromium executable failed at process launch (`spawn UNKNOWN`) before the extension loaded. This is an environment capability failure, not a passed browser integration test. The test is explicitly skipped unless a working executable is supplied. The bridge and actual DOM extractor are separately verified.

Packaging and installed-state results are appended below. Fixture dialogue is deterministic test output, not a claim of natural model quality.

## Packaged verification

- `npm run dist` produced the Windows NSIS installer and staged portable executable at version 0.4.0.
- Package layout verification passed 12 checks: main/preload/panel bundle hashes match the staged ASAR; all six extension files match source; Koffi native binary is present; the ASAR contains no profile/environment files.
- Packaged Life Context + PersonalContext + Honcho + BehaviorCore + conversation scene + production profile persistence: 18 passed, 2 existing condition skips.
- Packaged selected application movement/focus/sleep regression checks: 4 passed. Other cases in that large file were intentionally not selected.
- Packaged native/companion checks: 7 passed, including native reply focus with DOM input focus and actual typing, Escape foreground restore, both third/fifth rapid pat and poke paths, timed stays, avoidance and sleep. Fourteen unrelated cases were not selected in this run.
- Final layout was visually inspected; Connections uses the existing scroll container so the lower controls remain accessible in the normal narrow panel.
- Reports: `package-layout.json`, `packaged-tests.json`, `packaged-companion-tests.json`, `packaged-native-tests.json`. Generated diagnostics contain synthetic fixtures, not real source content.
- The two condition skips are the pre-existing opt-in real BehaviorCore model review and the opt-in real local Honcho derivation test. Actual Honcho derivation was not reverified in this run. The separate two-request Stage 1 real-model check did run and is recorded above.

## Installed and preserved

The stopped portable application was replaced with the tested 0.4.0 package. The real production profile was opened and checked: version 0.4.0, 40 approved memories, existing Codex connection ready, character startup 924ms. All new sources were disconnected, with the Chrome bridge off.

`memory.json`, encrypted `secrets.bin` and `relationship.json` matched their pre-update hashes. The full prior Chat history remained an intact prefix. Settings matched structurally after ignoring normal character-position changes. No existing stores were migrated by Stage 1. The existing profile-location policy and earlier changes were retained.

- Installed portable directory: `C:\Users\matth\Documents\Codex\2026-10-25\i-x20\outputs\Capri\release\win-unpacked`
- Previous application rollback: `C:\Users\matth\Documents\Codex\2026-10-25\i-x20\outputs\Capri\release\rollback-before-life-0.4.0-20261028-170315`
- Stopped profile backup: `C:\Users\matth\Documents\Codex\2026-10-28\files-pasted-by-the-user-capri\work\profile-before-life-0.4.0-20261028-170315`
- Actual profile: `C:\Users\matth\Documents\Capri Buddy`
- Verification record: `installed-check.json`

To roll back, close Capri, move the current `win-unpacked` aside, and rename the previous-application rollback directory to `win-unpacked`. Restore the profile backup only if you deliberately need its older state; restoring it replaces any conversations or settings created after the backup. Keep both copies until the update is accepted. No automatic source permissions were granted.

## Awaiting user setup

- Load the unpacked Chrome extension in the user's chosen Chrome profile, pair its ID/token, and explicitly approve the same sites in both Chrome and Capri. Browser-profile installation and real-site behavior require this setup; no claim of live Chrome-profile validation is made by source/fixture tests.
- Select actual project folders and add their explicit aliases. No real folders or sites have been enabled without selection.
- Optionally choose retained source history and bounded content access. Default collection is disconnected, project content is metadata-only, and source learning is unavailable.

## Deferred / unsupported in Stage 1

- Calendar, Last.fm, Spotify listening-history APIs, OwnTracks, Gmail, Outlook, Teams, Gradescope and Discord adapters are contracts only. Existing Spotify desktop/media metadata remains available through the original system.
- Provenance-aware Honcho integration learning, model-suggested entity merging, embeddings/full repository indexing, PDF/Office indexing, editor-specific extensions and claims about completed work are unsupported.
- The bounded project scan is not a complete audit of arbitrarily large repos. Symlinks and ignored/generated files are excluded. Git is optional. Rename evidence falls back to delete/create where file identity is unavailable.
- Sensitive-page detection and token-pattern redaction are conservative heuristics. Users must approve only suitable sites and content. A page's presence is not evidence of reading; metadata does not prove completion.
- Saved Chat is deliberately preserved on source forget. Only its automatic recall/learning is excluded. Consumption history survives restart only with source retention enabled, within bounded retention.

## Next integration stage

Use `LifeAdapter`, `LifeSource`, `LifeEvent`, `LifeEntity` and `LifeContext.ingest()` rather than adding a second initiative loop. Define per-provider credentials/scopes, stable IDs/revisions, deletion/correction/revocation behavior, delayed-delivery rules, freshness and minimal projections. Start new providers disconnected. Route meaningful candidates through existing BehaviorCore arbitration. Preserve current corrections and direct-chat priority. Keep Honcho source learning disabled until source-derived erasure can be proven end to end.

0.4.1 packaged/deployed results: package layout 12/12 checks passed; persistence/semantic-context suite 6 passed with one timing-sensitive candidate test initially deferred, then passed on isolated rerun; pose/native interaction suite 8 passed. Production installed check confirmed 0.4.1, 40 approved memories, existing Codex account connected, character startup 1075ms. Memory, encrypted credentials, relationship, prior Chat prefix and settings except normal position updates were preserved. Rollback: release/rollback-before-life-0.4.1-20261028-184201. The extension remains installed separately for the user to finish; no source permissions or interruption settings were changed. See installed-check.json, repair-persistence-tests.json, repair-candidate-recheck.json and repair-pose-tests.json.
