# Stage 2 validation: Capri 0.7.0

Stage 1 was present before this task and remains preserved, uncommitted, alongside
Stage 2. No account setup or new provider is required for native intentions.

## Confirmed checks

- TypeScript typecheck passes on final source and test fixtures.
- Complete unit suite: 650 passed in 63 files.
- Development build and Windows NSIS packaging pass.
- Development agency fixture: native placement, synthetic exposure/resize/lost
  target/retry, quiet ownership, timer deduplication and restart passed.
- Isolated packaged native enumeration/placement across connected displays passed.
- Isolated packaged stay recovery against a surviving external window passed.
- Companion movement suite: 23 passed after deterministic pointer-follow fixture.
- Adaptive attention suite: 20 passed after refreshing live availability at entry.
- Initial packaged integration selection: 38 passed, 6 skipped, 3 failed. Two
  agency native fixtures were repaired and passed individually afterward. The
  remaining relationship retirement/project-callback failure is also listed in
  the Stage 1 baseline comparison. It is not claimed fixed by Stage 2.
- Final combined packaged validation and deployment results appear below.

## Practical limits

Real account-backed external-service mutations and live Honcho deletion were not
reauthenticated. Existing opt-in fixtures may skip those operations. OS reminders
retain existing delivery semantics. An unavailable or unsafe exact window fails
visibly rather than switching applications. Window following is heartbeat based.
Native tests depend on actual exposed geometry; their helper surfaces are isolated
and remain unfocused. They use the existing Electron runtime for a surviving
external-window fixture, rather than asking a packaged Capri executable to run a
helper script.

The first mistaken packaged-helper invocation launched Capri normally once. It
used the existing profile and performed the Stage 1 startup import; no profile
reset, credential change or approved-memory deletion occurred. Later helper
launches have explicit isolated profiles. Final installation takes a stopped
profile backup before replacing the portable application.
## Final packaged and installation results

- Final packaged selection: 47 passed, 1 failed across five files (48 tests).
  All three agency fixtures, all adaptive-attention fixtures, foundation and
  production profile restart checks passed. The remaining failure is restoring
  the previous native window focus after Escape. Reply input focus and typing
  passed in that final run. The isolated focus case failed again. Comparison
  against the preceding 0.6.0 package also failed the same test, at its typing
  assertion rather than its Escape assertion. No exact equivalence is claimed.
- The final 0.7.0 Windows package includes the XState MIT notice.
- Deployed the tested ASAR to the established portable location, preserving the
  full previous unpacked application and stopped profile in this task's work
  directory. Deployed/staged ASAR hashes match.
- Normal Desktop shortcut launched the deployed 0.7.0 executable. Runtime reports
  character readiness, 40 approved memories, known name available, no settings
  repairs, no startup errors and no unavailable native bindings.
- Approved memory and encrypted-credential bytes match the stopped backup.
- Source changes remain local and uncommitted, preserving the Stage 1 work.

The full historical Electron suite is not claimed green. The relationship callback
failure and native focus limitation are retained as explicit handoff issues. No
full installer uninstall cycle or fresh external-account authentication is claimed.

Final structured comparison also confirms settings preserved except native position, original history preserved as an exact byte prefix, and the existing Codex provider selection retained.
