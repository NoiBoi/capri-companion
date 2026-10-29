# Capri 1.1 Stage 2/3 validation, 2026-10-29

Baseline: `73ec57b`, the Stage 1 cognitive-orchestration checkpoint. All runtime
fixtures use isolated synthetic profiles. No normal profile, external credential,
account pairing or installed application was changed.

## Final source checks

| Check | Result |
| --- | --- |
| TypeScript typecheck | Pass |
| Unit/integration suite | 739 passed, 69 files |
| Production build | Pass |
| Focused real application migration/Agency/foundation/cognition checks | 6 passed, 4 files |
| Windows NSIS package build | Pass, staged only |
| Packaged integration regressions before the final stable-ID delta | 105 passed, 8 skipped; 27 files |
| Final packaged migration/Agency/restart checks | 6 passed, 4 files |
| Final packaged permission deny/approve UI | 1 passed; other cases filtered |
| Packaged application content/native resources | 66 of 66 build files match; native Koffi present; no profile/private files listed |

Commands:

```text
npm run typecheck
npm test -- --reporter=dot
npm run build:prod
npx vitest run tests/e2e/capabilityMigration.e2e.test.ts tests/e2e/agency.e2e.test.ts tests/e2e/cognitiveFoundation.e2e.test.ts tests/e2e/cognitiveRuntime.e2e.test.ts --no-file-parallelism --testTimeout=60000 --hookTimeout=60000
npm run test:e2e -- --reporter=dot
```

`npm run dist` initially failed because the existing `release-staged/win-unpacked`
directory was locked. A fresh output directory was used without replacing it or
terminating the user's Capri. The final build uses:

```text
npx electron-builder --win nsis --publish never --config.directories.output=C:/Users/matth/Documents/Codex/2026-10-29/capri-1-1-stage-2-3/work/package-confirmed
```

Package checks set `CAPRI_EXE` to that directory's `win-unpacked/Capri Buddy.exe`.
They exercise the ASAR-packaged application; this is not a normal-profile install
or an NSIS install/uninstall acceptance claim. Version remains 1.0.0 pending the
complete 1.1 release. Existing `verify:package` runs a temporary installation plus
the broad native suite; its all-green installation claim is not substituted for
the explicitly bounded packaged checks recorded here.

## Scenario evidence

| Scenario | Evidence |
| --- | --- |
| Homework lifecycle | Live Life Context observes due evidence with unknown submission, offers once, records an attributed user report, suppresses unchanged callbacks through restart, and reopens one callback after an explicit negative correction |
| Conflicting sources | Same assignment identity retains independent user and explicit external negative assertions; conflict includes both sources. User corrections supersede prior user assertions with monotonic revisions, including same-millisecond messages |
| Focus/physical control | Existing Agency desktop suite verifies native arrival/bounds, quiet ownership, target movement/loss, suspension, cancellation, keyed timer restart and a 30-minute stay against the same actual external window after a full process restart |
| Deferred communication | A sourced request is deferred without model attempts, restored, delivered after availability returns, and acknowledged separately; delivery/acknowledgment survive restart |
| Project continuity | File/document identity associates with a configured project; filename evidence leaves geometry and success unknown. Narrow named user project-status updates synchronously reconcile relationship development, world assertion and cognitive closure |
| Privacy | Source report/assertion dependencies survive context selection and final prompt truncation. Revocation removes dependent state through SQLite restart and legacy JSON import; event-level non-retention is respected; authored Chat and unrelated project/notes remain. Source-tainted writes into legacy sinks fail closed |
| Actions | Actual saved-note effect shares the production Agency executor; replay causes no second effect. Unit cases cover current-policy denial, identity collisions, interrupted journal state, partial-effect cancellation, deadline/precondition/input failures, provider outage, private journal isolation and late results after revocation |
| Truthful delivery | Pre-action success narration is withheld. Failed tools deliver their actual result without a success rewrite. Model computer-workflow `done` is explicitly unverified and cannot establish a successful capability receipt |
| Continuity/session infrastructure | Existing session routing, correction, compaction, pending-deletion, private/source isolation and outage unit/integration regressions pass. Codex App Server implementation and account configuration remain intact |

The deterministic 48-hour scenario continues to pass all 25 checkpoints with no
model calls on ingestion. This is accelerated simulation, not a claim of two days
of live account traffic.

## Broad desktop run and baseline comparison

The broad source run completed with **235 passed, 5 failed, 10 skipped** across
28 files. It ran before the final additional privacy tests/attribution guard.
No all-green broad desktop run is claimed.

Failures:

1. Mode-control exploration expected the movement-owner diagnostic to describe
   exploration while it instead described a lower-ledge settling state.
2. Outing-before-inspection expected a sampled motion/roaming phase, but sampled
   the resting phase.
3. Cancelled-outing test expected one inspection model call, but observed zero.
4. Window-roaming test expected roaming while it sampled resting.
5. Greeting/touch test expected two model calls while it observed one.

A pristine `git archive 73ec57b` was extracted into a separate directory, built
with the same dependencies, and run against those five named tests serially.
Baseline result: **2 passed, 3 failed**. Failures 2, 3 and 4 reproduced on that
untouched checkpoint. On the migrated source, the five-case rerun had **2 passed,
3 failed**: failures 1, 2 and 3. Thus test 4 and test 5 passed when isolated from
the broad run; test 1 subsequently passed when run by itself, as it did on the
baseline. An earlier four-case run also passed the ordinary teleport-ray check,
window roaming and greeting/touch while reproducing failure 3.

These runs establish existing native timing/admission failures and sensitivity;
they do not establish that every native assertion is stable or that every broad
failure is proven unrelated. Their assertions were not disabled or relaxed.

Comparison command (on both checkouts):

```text
npx vitest run tests/e2e/app.e2e.test.ts -t "starts real window exploration through the mode control|starts the physical outing before inspection|second outing while cancelled|roams a visible window|contextual greeting and deliberate touch" --no-file-parallelism --testTimeout=60000 --hookTimeout=60000
```

## Final package evidence

The broad packaged integration run excluded only the already documented native
app suite: 105 passed, 8 skipped across 27 files. This preceded the final
within-turn stable request-ID delta. The final package then passed all six
migration/Agency/foundation/cognition cases plus the real deny/approve UI case.
That UI test first caught an overlong request ID; IDs were shortened to fit the
existing 64-character IPC boundary, a unit assertion was added, and the corrected
packaged UI test passed. The failing intermediate package is not the accepted
artifact.

Packaged command for the broad integration run:

```text
npx vitest run tests/e2e --exclude tests/e2e/app.e2e.test.ts --no-file-parallelism --testTimeout=60000 --hookTimeout=60000
```

Final acceptance also runs the four focused files listed above and the app test
matching 'asks before opening a URL and does nothing when denied'.

Package integrity: all 66 installed build files match the current production
build byte-for-byte. Native Koffi is present. No .env.local, secrets.bin,
history.jsonl, memory.json or settings.json is listed in the ASAR.

- Main bundle SHA-256: `7ade16d10686d0e81c3ff052a4d0ff2abb4c92d074e56c1d9e761855c1f7a5c3`
- Installer SHA-256: `7ea4bd3ea6b50ba28b1b3f0044dd82668ec8f1a8c69c2f728a5ee613b3cef803`
- Installer size: 141353472 bytes

The checked-in CAPRI_1_1_STAGE23_PACKAGE.json records these artifact properties.
Temporary package folders remain after automatic approval review rejected the
cleanup operation with 'blocked by policy'; no cleanup retry bypass was used.

## Limits

Live paid-provider/Luna history acceptance, live Honcho derivation and external
service credentials were not required or provisioned. Their explicitly opt-in
tests remain skipped. Mocked provider/session tests and existing offline/native
adapters supply the recorded evidence. Computer workflows without independent
outcome confirmation intentionally return unknown, not verified success.

Source-aware Life Context remains the place for source-derived follow-through.
The legacy personal-memory/note/manual-reminder sinks have not been declared
dependency-aware; source-tainted persistent writes to them are refused.
Unrelated user-authored personal memory and relationship continuity are preserved.
