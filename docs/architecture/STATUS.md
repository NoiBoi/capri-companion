# Capri 1.0.0: Stages 5 and 6

Character performance and long-horizon stabilization are implemented and installed. Read FINAL_REPORT.md for exact evidence and limitations. Final unit/type checks pass (689 tests). The accelerated 48-hour scenario passes 25 integrated assertions. Two actual-model sequences preserve 62 first generations. Final focused packaged checks pass 19 cases with 3 deliberate skips, including crash recovery and real native-model restart. The earlier broad package run was 232 passed/5 failed/10 skipped; failures and retests are retained, and a single all-green broad run is not claimed. Normal production launch preserves 40 memories, saved identity, provider connectivity and settings, with all 155 prelaunch profile files preserved. Actual external multi-day reliability remains unverified. The first hidden-style renderer startup stall and its successful ordinary-launch recovery are recorded, not hidden.

# Current Stage 4 update: product 0.9.0

Read [STAGE4.md](STAGE4.md), [STAGE4_VALIDATION.md](STAGE4_VALIDATION.md) and
[STAGE5_HANDOFF.md](STAGE5_HANDOFF.md) for current semantic perception, world
projections, social attention, privacy and release evidence. Stage 3 sessions and
Stage 2 actors remain the runtime owners. Earlier stage records below are historical.

# Current Stage 3 update: product 0.8.0

Read [STAGE3.md](STAGE3.md), [STAGE3_VALIDATION.md](STAGE3_VALIDATION.md) and
[STAGE4_HANDOFF.md](STAGE4_HANDOFF.md) for current session, cognition, privacy and
release ownership. Earlier descriptions below are preserved historical stage
records; references to persistent model sessions as future work are superseded.

# Current status: Stage 2 / product 0.7.0

Implemented durable XState intention actors, typed native skills, single optional
initiative arbitration, source-backed availability, transactional operational
checkpoints, cancellation, restart/sleep deadline recovery, and the offline
stay-at-window vertical slice. Stage 1 work and user data are preserved.

Validation and release results are recorded in `STAGE2_VALIDATION.md`. The Stage 1
results below are historical baseline evidence, not the final Stage 2 test count.
Architecture and continuation: `STAGE2.md` and `STAGE3_HANDOFF.md`.

## Historical Stage 1 validation
# Stage 1 status

Working foundation implemented on `capri-lachy-integration`, based on `e373b4b1aeaa28bac540c2931b70f3684254fc12`. Source changes remain local and uncommitted. Product version is still 0.6.0. The staged Windows build was tested with isolated synthetic profiles; the production profile and installed portable application were not replaced.

## Completed

- Host-independent core contracts, retention and revocation rules.
- SQLite migrations, transactions/savepoints, integrity and dependency checks, verified backups, crash recovery and monotonic projection updates.
- Transactional scene and Life checkpoints, including retained observations, watermarks and durable deferred-attention candidates.
- Bounded invocation and completed-action metadata, existing-provider session adapter, scheduler adapter and extracted host foundation composition.
- Supplied-evidence provenance, continued ordinary user learning, source-safe extraction, selective scene invalidation, legacy-file scrubbing and preserved source-specific Honcho deletion paths.
- Existing profile, credentials, movement owners, settings, UI, integrations and cumulative dialogue guide retained.
- Architecture, migration/recovery and Stage 2 handoff documentation.

## Measured validation

| Check | Result |
| --- | --- |
| Typecheck | Passed on final production source and added tests |
| Unit suite | 634 passed in 62 files; final run used two workers |
| Foundation and conversation unit subset | 52 passed, including malformed legacy imports and revoked action permissions |
| Development build | Passed |
| Production build and Windows NSIS packaging | Passed |
| Critical packaged Electron suites | 53 passed, 5 skipped across 13 files (11 passed files, 2 skipped files) |
| Final packaged foundation fixture | Passed again with automatic learning explicitly enabled; ordinary user learning remained queued with an enabled-but-empty Chrome source |
| Initial broad Electron run | 210 passed, 16 failed, 9 skipped across 18 files; this exploratory run preceded the last fixes |
| Untouched starting-commit comparison | Of those 16 selected cases: 3 passed, 13 failed |
| Final packaged comparison of the same 16 cases | 4 passed, 12 failed; every remaining failure also failed on the untouched starting commit |
| Patch whitespace check | Passed |

The broad suite is not fully green. The 12 remaining comparison failures are listed below and were reproduced on the starting commit. Three initially uncertain cases (mode-controlled exploration, completed voice-only episodic delivery, and curiosity after restart) passed on the final package. The baseline's roaming test also passed in the final isolated run; this is not claimed as a deliberate fix. An earlier unit run overlapping Electron tests hit the existing MemoryStore size-cap timeout; the final complete two-worker run passed.

The packaged suites include simulated observations, mocked providers/source APIs, native runtime SQLite, panel and profile restart checks. Existing opt-in conditions skipped real Chrome-extension deployment, live Honcho and some provider/location tests. Real account-backed Codex generation, real communication accounts and live Honcho deletion were not reauthenticated or exercised. Unit/mock coverage and existing credential/deletion implementations are retained. No full installer install/uninstall verification or desktop-shortcut deployment is claimed.

## Remaining baseline comparison failures

- opening and taskbar controls retains authored local dialogue, gestures offline and rejects generated title recitals
- opening and taskbar controls aims the bubble at the transformed face for inverted and mirrored poses
- reference transmission visuals loads portraits and fonts, shows elapsed loading and the actual error, and fits an expanded composer
- attached bubble chat shows muted replies after the large panel is closed, and wraps long text inside the screen
- connected companion personality connects repeated touch, animation, mood decay and disabling expressive behavior
- purposeful company does not start a second outing while cancelled movement is still unwinding
- contextual companion interactions offers an offline drop fallback and respects an explicitly quiet generated answer
- contextual companion interactions exposes new local behaviors and cleaned secondary artwork in the developer panel
- contextual companion interactions uses one visual request to produce a comment and validated inspection coordinates
- contextual companion interactions denies an exhausted inspection budget before capturing a screenshot or calling the model
- contextual companion interactions debounces ordinary window placements into one contextual request
- lasting relationship in the real app handles spoken-style retirement locally and offers only eligible project callbacks

## Stage boundaries

Later-stage cognition, persistent Luna/App Server sessions, intention arbitration and autonomous capability planning are not implemented. The core ports for those responsibilities exist. Current behavior, personal-context intentions, identity/profile stores and action execution retain compatibility owners. Behavior's unpartitioned source-derived cache is deliberately conservative; see ARCHITECTURE and HANDOFF before changing it.
