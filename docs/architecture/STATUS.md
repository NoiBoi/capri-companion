# Capri 1.1 status — October 29, 2026

Version 1.1.0 is implemented and staged. Verification is complete within the user-requested scope freeze. The installed normal-profile application has not been replaced.

CognitiveRuntime owns the initiative clock, bounded agenda/subjects, working-state persistence, conversational cognition, presence proposals and presentation director. BehaviorCore is a required-runtime interpreter; action definitions and native executors cannot independently initiate core work. Existing Agency/XState and the shared capability executor remain the durable/execution authorities.

Verified so far: TypeScript, 761 unit/integration tests, production/NSIS build, 30 virtual-day assertions, native migration/restart checks, two complete Luna dialogue sequences with shared selective interpretation, an actual optional-model communication transition and a real packaged Luna restart. First broad source run: 239 pass / 1 fail / 10 skip. First broad package run: 240 pass / 2 fail / 9 skip. The failed fixture assumptions and all first outputs are retained, not erased.

Latest broad ASAR run: **241 passed, 1 failed, 9 skipped**. Remaining failure: native reply-window focus activation (companionVisits.e2e line 171). The final automatic-movement precondition delta subsequently passed both affected packaged checks. The full suite was not repeated after that delta; no completely green release is claimed. The user requested deferring remaining minor issues.

See [FINAL_REPORT.md](FINAL_REPORT.md) for exact scope, failures and limitations; [ARCHITECTURE.md](ARCHITECTURE.md) for ownership; [MIGRATION.md](MIGRATION.md) for retired pathways and data recovery; [SCENARIO_RESULTS.md](SCENARIO_RESULTS.md) for the state traces and genuine model review.

Remaining limitations include subtle attribution/style failures, conservative source-derived context exclusions, native callback/geometry code still in the host, historical standalone scene-reading compatibility, optional legacy live harnesses with obsolete profile/captured-artifact dependencies, and no real uninterrupted 48-hour deployment. Synthetic tests do not prove human-like immersion or automatic knowledge of real-world outcomes.
