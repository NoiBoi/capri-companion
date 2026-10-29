# Capri 1.1 completion and release verification

Date: October 29, 2026. Version: 1.1.0. Baseline: fdd9e85 (1.1 Stage 2), preserving the e593c51 1.0 lineage. This report separates real Windows execution, genuine Luna generation, synthetic state/control scenarios and unverified live-world claims. The installed production application/profile were not replaced.

## What changed

CognitiveRuntime now owns the working-state checkpoint, conversational cognition, presentation director, priority agenda and initiative clock. BehaviorCore requires that runtime and retains only bounded interpretation/execution concerns. Follow-up priorities moved out of index.ts; the dormant native teleport scheduler, duplicate durable-control paths, per-turn legacy session wrapper, obsolete import shims and production scene-reading ownership were retired. The action registry remains the existing implementation/schema adapter behind the shared capability executor. Native physics, art, TTS, Win32 geometry and renderer communication remain intact.

Meaningful character transitions can be interpreted in the existing budgeted learning batch, supported by exact delivered quotes, roles and revisions. Positions/reasons, changed views, questions, criticism and conversational intentions persist without inventing profile facts or replacing RelationshipStore. Ordinary follow-ups retain persistent Luna continuity. Disabling learning/provider access leaves deterministic/offline behavior intact. Obsolete scene readings are retired while their transcripts are preserved.

The runtime-owned presentation director carries a decision's purpose into coordinated expression/speech or silence and checks action completion before continuation. Native taskbar arrival now requires final-bounds verification. Quiet/game availability, physical ownership and generation cancellation remain authoritative. Authored retirement checks stable IDs before speech punctuation changes; generated replies accept category feedback. Legacy generated phrase exclusions become bounded diagnostics rather than global bans. Tool failures carry action-result provenance rather than masquerading as generated character opinion.

Two additional correctness fixes matter in ordinary use: closing one conversation no longer abandons unrelated deferred obligations; unavailable/cancelled/budget-denied reasoning no longer dismisses communication or spends semantic attention attempts. Important deferred requests get a useful-notice direction on availability, with evidence freshness and prior resolution still controlling delivery.

Full component ownership and retired pathways are in [ARCHITECTURE.md](ARCHITECTURE.md) and [MIGRATION.md](MIGRATION.md).

## Verification ledger

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| All unit/integration tests | 761 passed, 70 files |
| Production bundle | Passed |
| Virtual 48-hour scenario | 30 executable state/receipt checks; 2,280 active ticks, seven synthetic native executions; actual placements verified separately |
| Focused Windows legacy reconciliation | Six native cases passed, with remaining cases deliberately filtered |
| New real chat/cognition/provenance/restart integration | Passed; actual delivered evidence -> shared learning request -> revised persisted thought |
| First full source Windows run | 239 passed, 1 failed, 10 skipped; failure was a pickup fixture that never lifted |
| First full ASAR Windows run | 240 passed, 2 failed, 9 skipped (251 cases, 29 files); both failures were optional generated-pat fixture assumptions |
| Final full ASAR Windows run | 241 passed, 1 failed, 9 skipped (251 cases, 29 files); remaining failure is native reply-window focus activation. This run precedes the final automatic-precondition delta; its two affected packaged guard/authority checks passed on the final build. No all-green broad run is claimed. |
| NSIS Windows installer build | Passed, staged; no normal-profile installer/uninstaller claim |
| Package content audit | 66/66 production files match byte-for-byte; native Koffi present; no private settings/memory/history/secret/.env filenames in ASAR |
| Genuine Luna dialogue | Two complete 30-turn first-attempt sequences, two compaction continuations, provider-process restarts and successful thread deletion |
| Shared cognitive extraction | Three actual Luna learning requests across the second 30-turn sequence; exact source citations recorded |
| Actual optional decision lane | Zero model calls while gaming; one available-event call, useful meeting-request line, synthetic host delivery and actual candidate delivery transition |
| Actual packaged Luna session restart | Passed on the first full ASAR run: same native session and two completed turns across process restart, synthetic code word recalled, thread deletion confirmed |
| Resource measurement | Packaged: 625 ms character-ready, 849 ms launch-to-ready wall time; 460 MB / 0.3% of one core idle, 528 MB / 0.9% active, 445 MB / 0.1% hidden; 15 fps idle |
| Event/SQLite stress | 5,000 accepted events, 5,000 rejected duplicates, 2,000 messages, zero model calls; 49,152 bytes after both 1,000 and 2,000 messages; integrity and restart checked |

The resource measurement was performed on the preceding 1.1.0 package before the final native precondition-only delta, rather than repeated after the user requested reduced testing. The bounded resource run observed 44 one-second samples and two checkpoint writes, not a model request per tick. Fresh offline SQLite was 24,576 bytes. Stress retained 32 subjects, 16 deferred proposals, 128 seen keys and 16 extraction evidence messages. Its 9,000 actual checkpoint writes took 18.1 seconds under an intentionally accelerated write workload. These results do not prove absence of a multi-day leak.

Existing provider-session policies remain: at most four active sessions, rotation at 160 turns or configured age/instruction/model change, compaction above 80,000 reported context tokens with spacing, interrupted-session invalidation and durable deletion debt. Tests exercise rotation/compaction/failure policy. Actual dialogue reached 34–36k reported context, then explicit compaction/restart; a 160-turn live lifetime was not performed.

## First failures and corrections

All failed attempts and later runs are retained in the verification bundle. Initial unit failures identified assertions for the deliberately retired generated-phrase ban and a quiet-plan shape; the retirement expectations were updated and the quiet-plan shape was corrected. A newly added normal-conversation test caught repeated interpretation of already considered evidence after an empty result; interpreted evidence IDs now prevent it.

The first native source suite found that a supposed pickup sent mouse-down/up without crossing the four-DIP lift threshold. A deterministic pointer/button input drives the same production DragController transition; the test still asserts cancellation and the user's final position. Earlier mode/roaming/inspection tests also sampled random settle choices while asserting roaming. Their fixtures now select the intended roaming branch; production movement variety remains. The first broad package run found the analogous optional generated-pat branch expectation. Its fixture selects that branch explicitly. No native assertion was weakened to accept the wrong outcome.

The final native audit also found that scheduled automatic movement could bypass the connection precondition when it called go directly. That precondition now lives in the native executor alongside setting, idle, blocker and cognitive-lease checks; a direct-executor regression rejects movement before any cue. Manual/offline user movement remains available.

The new presentation integration caught an actual retirement bug: punctuation normalization could change authored text before an ID lookup. Retirement now checks provenance ID before normalization. The first new cognition IPC fixture used an unauthorized character sender for a chat-only channel; it now exercises the real Chat panel instead of weakening sender checks. The original performance helper could wait indefinitely for a quitting process; its measurement helper now uses bounded shutdown and cleans only its own verified process. The legacy replay entry also lacked the Markdown loader required by the bundled guide; it was repaired and all six deterministic replay scenarios ran. The initial package-audit helper used non-native path separators; correcting the audit established the 66/66 match, without an artifact modification.

Earlier 1.0/Stage 1/Stage 2 broad failures are retained in historical reports and COGNITIVE_RUNTIME_VALIDATION.json / CAPRI_1_1_STAGE23_VALIDATION.md. The full package rerun remains non-green because the native reply-window focus assertion failed. The user then requested a scope freeze and no further minor fixes/testing. Final verification was limited to the changed native automatic-movement/authority checks (2 passed). The focus issue is retained for later work; historical failures have not been erased or relabeled as original passes.

## Character findings and limits

[SCENARIO_RESULTS.md](SCENARIO_RESULTS.md) preserves all measures and observed weaknesses. The same broad scenario previously used for 1.0 now checks actual runtime authority and delivery evidence. The new release fixes concrete closure, provenance, retry and ownership faults. These small, non-blinded conversations do not prove that every companion interaction feels better than 1.0.

Both broad live sequences still contained self-credit after quiet. The second sometimes overaccepted criticism, admitted an unsupported earlier misunderstanding and used repeated concession openings. Both generic optional-event conversations stayed quiet on the available email; the subsequent actual optional execution lane delivered a useful notice, which does not erase the broader failures. There is no mandatory second rewriting pass, invented psychology or permanent generated-text blacklist hiding these outputs.

Not established: an actual uninterrupted 48-hour live deployment, real attendance/exercise/submission from third-party metadata, all private-service credentials, live audio perception, a new TTS billing test, or normal-profile NSIS install/uninstall acceptance. Native focus remains a known limitation: the latest broad run failed to activate the reply window in companionVisits.e2e at line 171. The same case passed in the earlier broad run, but stability is not established and no fix is claimed. Character interpretation is selective and may miss a subtle transition; the inexpensive fallback remains conservative. Source attribution still deliberately over-excludes some derived context. Native callback/geometry code remains substantial in index.ts, under the single runtime's authority.

## Artifact and reproduction

The accepted artifact manifest is [BUILD_MANIFEST.json](evidence/stage33/BUILD_MANIFEST.json). Installer: Capri-Setup-1.1.0.exe, 141,355,798 bytes. SHA-256: 45305363e9b531a0e906e4387aab375f619a40647cdf573e07137925472a4cbb. Main bundle SHA-256: f019c01883e916e988080dec36b8e0820f1a6d68594cd0b5348d6a8b761e6c27. These identify the tested staged build, not the older installed application.

Commands: npm run typecheck; npm test -- --reporter=dot; npm run build:prod; electron-builder --win nsis --publish never with a fresh task-specific output directory. Set CAPRI_EXE to the accepted win-unpacked/Capri Buddy.exe and CAPRI_LIVE_SESSIONS=1, then run vitest run tests/e2e --no-file-parallelism --testTimeout=60000 --hookTimeout=60000 --reporter=verbose. The staged ASAR suite is distinct from verify:package's NSIS install/uninstall workflow; that workflow was not used to alter the user's installed registration/shortcuts.

The normal profile, credentials, approved memories, permissions, history, extension pairing and installed configuration were left with their current running application. No external account was provisioned or reconnected. Follow OPERATIONS.md for stopped-profile backup and rollback before installation.

## Scope freeze

At final handoff the user explicitly requested a faster finish and deferral of minor issues. No more feature work, model evaluation or broad reruns followed. The final package has the 2/2 changed-path native checks and 761 passing unit tests; the preceding broad package result remains 241/1/9. Its successful live Luna restart was repeated with the same synthetic code word. Nine skips cover microphone/STT, live Gemini, legacy opt-in model harnesses, live Honcho and MV3 transport prerequisites. They are not passes.
