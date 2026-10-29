# Capri operations

## Data and release safety

The normal launcher is C:/Users/matth/OneDrive/Desktop/Capri Buddy.lnk. It resolves to the portable release/win-unpacked/Capri Buddy.exe in the established checkout. Current production data is C:/Users/matth/Documents/Capri Buddy, selected by profileDirectory. Historical AppData profiles and migration backups must remain intact. CAPRI_USER_DATA is only an explicit isolated test override. Never point tests at production.

Before replacing the portable package, ask the running executable to quit with --quit, wait for its exact executable's processes to exit, then copy the complete stopped profile to a private work backup and archive the prior application directory. Copy the tested staged directory. Verify ASAR equality before relaunch. Preserve credentials, Chrome pairing, source grants, identity, approved memories, history, Honcho deletion state and settings. Compare settings structurally when only normal position updates differ. A matching file hash is insufficient: inspect saved-profile-loaded and character-ready startup events and the real Memory panel after a normal Desktop shortcut restart.

Rollback application files first while stopped. Current SQLite schema remains version 2, compatible with 0.9.0. Do not overwrite newer personal data merely to roll back program files. Restore the stopped-profile backup only when recovery actually requires it, preserving the newer profile separately first. A database with an unsupported future schema, failed integrity check or unreadable existing JSON must surface an error, never silently initialize an empty identity. Old user data and migration backups are not cleanup targets.

## Cognition and presentation

Direct user interaction preempts optional thought collection. XState AgencyRuntime owns quiet, stay, avoidance and timer commitments, their absolute deadlines and cancellation. A stay requires a verified placement receipt. Suspension does not run reasoning. Resume reconciles elapsed deadlines and revalidates physical targets. Offline behavior, physics, gestures, timers and explicit stays do not require a model.

BehaviorCore remains the sole optional model decision owner. It uses BackgroundBudget, source/evidence admission, social availability and one initiative lease. LifeContext ingests without a model, bounds evidence, snapshots and candidate queues, and coalesces matching evidence. No new polling model loop was added.

PerformanceDirector validates existing presentation choices and records bounded animation request/completion/interruption status. The renderer reports actual clip completion; an expired request is not success. Quiet commitments suppress scripted arrival banter. Direct chat remains available. Source-backed physical facts and completed native receipts outrank generated action descriptions. Unverified claims and closed-subject callbacks are withheld before text/audio delivery. Validation can still miss paraphrases or withhold a valid physical claim; it is a conservative local boundary, not a factuality model.

Authored speech carries a stable template ID. Retiring a line disables that exact authored template; generated text has optional Repetitive, Too generic, Out of character and Poor timing feedback in Chat. Feedback retains category and time only, at most 128 entries for 30 days. Timing feedback suppresses optional speech for ten minutes. Other feedback adds brief temporary generation guidance. It never changes permanent identity memory. Private messages have no stored feedback. Historical retired expression rules remain until restored. Clear history/activity clears these diagnostics.

## Providers and source setup

Keep existing encrypted credentials and browser pairing. Disconnected services do not require setup to launch or use local behavior. Calendar, Last.fm, OwnTracks, Gmail/Outlook, Teams and authorized Discord account/guild sources require their existing account configuration and permission scopes. Do not infer gameplay or voice activity from process names, exercise from geofence proximity, submission from an open page, or attendance from Calendar. There is no direct Gradescope API or CAD geometry reader. Browser DOM reading needs the paired extension and exact-site content grants; reload its existing unpacked directory after upgrading rather than creating another token.

Codex primary/project sessions are durable only with history retention. Source-backed/private turns use isolated bounded sessions. Privacy changes invalidate caches and dependent native sessions, with pending remote deletion retried after provider recovery. Revocation blocks use immediately even while a remote deletion is awaiting service availability. Other configured providers retain their existing stateless adapter. Do not remove that adapter as unused architecture.

## Diagnostics and reproduction

Read docs/architecture/FINAL_REPORT.md and SCENARIO_RESULTS.md for exact verification scope. Logs contain startup identity counts rather than approved-memory contents. First-attempt synthetic dialogue is preserved separately. Never publish private profile backups, secrets.bin, real inbox records or model session credentials.

Typecheck: npm run typecheck. Units: npm test -- --maxWorkers=2. Build: npm run build. Windows package: npm run dist, which stages the unpacked application before deployment. Electron checks run serially with CAPRI_EXE pointing at the staged package and synthetic CAPRI_USER_DATA directories. CAPRI_LIVE_SESSIONS=1 enables the bounded actual-model restart fixture. The deterministic day-in-life scenario lives in tests/scenarios/dayInLife.ts; CAPRI_SCENARIO_REPORT saves its results. scripts/stage5-character-eval.ts saves append-only original generations and delivery decisions. Use a new output filename for every run.

Future improvements with the highest value: broaden subject closure beyond explicit named terms without imposing global text bans; reduce unnecessary concessions to delivery criticism; improve native focus return across external applications; exercise live authorized sources across an actual multi-day workload; measure long-duration resource growth. Keep ordinary silence and independent opinions as successful outcomes.


## Final 1.0.0 release record

Private stopped-profile and 0.9.0 application rollback: C:\Users\matth\Documents\Codex\2026-10-29\complete-the-original-capri-1-0\work\stage6-release-20261029-031809. All 155 profile files matched before normal relaunch. Use an ordinary visible Desktop shortcut launch for this interactive companion. A first hidden-style launch stalled; after clean shutdown and terminating its lingering owned processes, two ordinary launches succeeded. Do not reset data or delete caches to reproduce a successful startup. See FINAL_REPORT.md for the remaining uncertainty and exact validation results.
