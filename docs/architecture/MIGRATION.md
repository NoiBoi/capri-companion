# Capri 1.1 migration and legacy retirement

This supersedes the earlier compatibility instructions retained in [history/MIGRATION_PRE_1_1.md](history/MIGRATION_PRE_1_1.md). SQLite schema remains version 2; product version is 1.1.0. New checkpoint fields are additive. Approved memories, credentials, source permissions, pairing tokens, history, settings and existing integration formats retain their owners.

## Retired live pathways

| Old pathway | Replacement and migration |
| --- | --- |
| BehaviorCore legacyState and optionalAfter | Required CognitiveRuntime state reference and its initiative clock; there is no standalone production admission fallback |
| behavior-state.json as an ongoing writer | Validated one-time import to cognitive-working; remove that exact legacy file only after successful checkpoint save. Privacy/reset clears or tombstones the new state and scrubs the legacy file |
| Host-created PerformanceDirector | Constructed by CognitiveRuntime; host retains a reference to that same object |
| Host follow-up priority/agenda construction | CognitiveRuntime.contextOpportunities, existing evidence owners and the one agenda |
| Global dialogue closure abandoning every cognitive subject | Only the active conversational subject is transitioned; unrelated mail/deadlines remain eligible |
| Duplicate production ConversationScene reading | Retire the derived reading while preserving all transcript entries. MemoryLearning no longer writes a competing scene interpretation when runtime cognition is present |
| LegacyModelSessions wrapper allocated on every direct round | Existing ConversationSessions for production; direct provider streaming for explicit standalone compatibility. Non-Codex in-flight source cancellation is handled by ConversationSessions too |
| main/cognitive/dialogue re-export; behaviorExperiment/core shim | Callers use core/DialogueCognition or the explicit replay harness |
| TeleportController autonomous timer, startAuto/rearm/schedule | PresencePolicy owns cadence. autoTick is a one-shot native preflight with truthful result, no scheduling; automatic native execution requires the cognitive lease |
| Duplicate unreachable durable controls in index.ts | Existing AgencyRuntime command/execution paths; host keeps only non-durable mode/look/window execution |
| Generated phrase retirement / fuzzy matchesRetired | Exact authored IDs plus temporary category feedback. Generated text passes through unchanged by retirement |
| Text-based retirement IPC | Existing channel now accepts the stable authored ID. Renderer buttons submit provenance IDs; pasted authored catalog text resolves to its ID locally |

No working artwork, pose, physics, Win32, TTS, speech/bubble, Chrome, OAuth, calendar, mail, academic, project, location, music or Honcho adapter was removed. Standalone replay tools now explicitly compose the actual CognitiveRuntime, instead of relying on a production fallback. They acquire its real attention lease; bypass-rejection tests continue using the production interpreter directly.

## Data safety

Legacy generated exclusions become id/category/original-time diagnostics in legacy-dialogue-feedback.json; their phrase text is not copied into a new ban list. Recent feedback is applicable only for its original ten-minute window, without refreshing on startup. Legitimate authored exclusions are retained. Existing explicit user preferences remain in approved memory/relationship/settings; migration does not invent a generalized personal preference from a disliked sentence. Old chat messages without provenance do not acquire fabricated authorship.

Cognitive extraction is attached to the existing learning batch, gated by existing memory/history/learning controls. Source-derived replies remain conservatively excluded. Revocation cancels dependent work and uses existing Life/session/Honcho/legacy-cache erasure routes. Source-tainted writes into legacy notes/approved memory/manual-reminder sinks remain refused. Unavailable interpretation leaves the deterministic/session path functional.

The installed production profile was not replaced or reset. Release tests use isolated synthetic directories and the staged ASAR executable. A built installer is not proof of a normal-profile install. Before replacement, follow the stopped-profile backup and complete rollback-package procedure in OPERATIONS.md. Restore credentials only with their owning stopped-profile snapshot; do not roll back secrets independently.

## Remaining migration debt

Native geometry and presentation execution remain substantial in index.ts by design. Some callback assembly and native admission checks remain local preconditions; they cannot initiate optional work without runtime admission. ConversationScene's old reading API remains available to historical standalone consumers/tests, but is retired from production interpretation. PersonalContext/episodes/relationships remain distinct evidence projections rather than bulk-migrated storage. Conservative source attribution can clear more operational context than ideal. The existing lexical closure/question fallback is intentionally limited; structured cognition supplements it selectively.

No independent core cognition/initiative remains in the host, BehaviorCore or action registry. This is an ownership claim supported by runtime identity and bypass tests, not a claim that all old code has disappeared.
