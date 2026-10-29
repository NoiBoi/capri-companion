# Stages 5/6 current ownership

The Stage 1-4 descriptions below are historical implementation records. Current ownership adds a host-independent PerformanceDirector and specific entity-mention resolver in src/core. DialogueCognition remains portable operational state over the Checkpoints contract; its location under main is a composition detail, with no Electron/provider imports. Electron main composes persistence, native adapters, source services and character delivery. Host-specific movement, focus and renderer lifecycle still necessarily live there; this is not a claim that the file is minimal.

PerformanceDirector receives the existing validated cognitive expression plus quiet/availability/motion state. It can admit speech, admit an available gesture without speech, or remain silent. No separate model call is required. Renderer reaction clips report completed/interrupted execution through a char-only validated IPC channel, correlated to host request IDs; missing receipts expire rather than claim success. Completed native movement receipts and current renderer body/pose remain authoritative. All direct generated replies are withheld until presentation validation, including when the retired-line list is empty.

Speech provenance belongs to ChatMessage/bubble delivery metadata. Authored templates have stable exact IDs; generated-direct and generated-spontaneous remain distinct from action-result and system-error. RetiredLines owns authored ID exclusions and read-only-compatible historical expression preferences. PerformanceFeedback owns bounded category/time diagnostics through the same transactional SQLite checkpoint owner. It does not own permanent user facts or Capri tastes. Temporary delivery feedback expires and never grants capabilities. DialogueCognition owns bounded explicit conversational closures; RelationshipStore continues to own separately attributed Capri opinions and project threads.

LifeContext remains the evidence and deferred-attention owner. Project aliases resolve using the most specific overlapping span; distinct mentions can return distinct entities. Reported submission reconciles recognized assignment callbacks and unambiguous matching calendar/page titles without promoting a user report to platform confirmation. New contradictory evidence/correction can reopen follow-through. No new polling orchestrator, framework or state store was introduced. Unused hostScheduler was removed after confirming no runtime references. LegacyModelSessions is still used by nonnative/fallback providers, so removing it would break supported integrations.

See STAGE5.md, SCENARIO_RESULTS.md, OPERATIONS.md and FINAL_REPORT.md for behavior, evidence, migration and release limits.

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

# Current architecture: Stage 2

Product 0.7.0 adds XState v5 durable agency on the Stage 1 storage foundation.
Read [STAGE2.md](STAGE2.md) for current ownership, skills, recovery and limitations.
The agency runtime now owns explicit intentions, physical commitments, availability,
deadline reconciliation and optional initiative arbitration. Company is a read
projection; native auto teleport yields its former scheduler to the heartbeat.
The Stage 1 boundaries below remain the data/privacy foundation. Their references
to intention orchestration as future work are superseded by STAGE2.md.

Current continuation: [STAGE3_HANDOFF.md](STAGE3_HANDOFF.md).

## Preserved Stage 1 foundation
# Capri cognitive foundation

Stage 1, based on `capri-lachy-integration` at `e373b4b`. Product version remains 0.6.0. This document describes implemented boundaries and the destination architecture, not a claim that the destination is complete.

## Responsibilities and current ownership

| Responsibility | Current owner | Stage 1 boundary |
| --- | --- | --- |
| Electron lifecycle, IPC composition, foreground arbitration | `src/main/index.ts`, preload and shared IPC schemas | Keep native handles, windows and IPC authorization here. Extracted checkpoint startup and revocation orchestration to `main/cognitive/foundation.ts`. |
| Immediate conversation | `ai/conversation.ts`, `store/conversationScene.ts` | Core retention transform; transactional scene checkpoint; request dependency capture; existing history remains JSONL. |
| Optional initiative, interpretations and interests | `behavior/core.ts` | Existing single decision path remains. Dependencies propagate through its unpartitioned compatibility cache; derived cache is not persisted or learned. |
| Perception and world projections | `life/context.ts`, `life/service.ts`, Chrome/project adapters, Stage2/Stage3 | Transactional Life checkpoint owns retained observations, watermarks and attention candidates. Existing latest/current projections remain deterministic and bounded. |
| Identity, user knowledge and relationships | `store/dataStores.ts`, `relationship.ts`, `personalContext.ts`, `companionScenes.ts`, `ai/memoryLearning.ts` | Existing approved profile and dated user evidence stay authoritative. Derived scene entries are removed before extraction. |
| Long-term interpretation | `ai/honchoMemory.ts`, `life/stage2.ts` | Native and opt-in source workspaces remain separate. Durable tombstones, epoch cancellation and confirmed deletion remain in their existing owners. |
| Model invocation and login | `ai/providers.ts`, `ai/codexAccount.ts` | `main/cognitive/runtime.ts` adapts existing providers to the core session port. Codex still uses ephemeral CLI invocations and installed account authentication. |
| Validated actions and timers | `actions/registry.ts`, `store/dataStores.ts` | Existing validation/confirmation remains; permissions are rechecked before dispatch. A bounded latest completion receipt records tool ID and outcome, never payload. |
| Native movement and placement | `desktop/win32.ts`, `desktop/teleport.ts`, `desktop/teleportController.ts`, main-process perch/drag/tour logic | No native handle enters the core. Existing completed movement records remain authoritative. |
| Character, speech and presentation | renderer character, `buddyBubble`, speech/voice host modules, main presentation handlers | Expression port is a future contract. Existing delivery receipts and native visibility/focus paths remain operational. |
| Settings, credentials and permissions | `settingsStore.ts`, `secrets.ts`, shared settings, IPC handlers | Existing settings and DPAPI encrypted secrets are retained. No credentials enter SQLite. |
| Evaluation | `tests/unit`, `tests/e2e`, replay scripts | Core retention/revocation tests run without Electron; real Electron and packaged checks exercise migrated host slices. |

## Core contracts

`src/core/contracts.ts` defines evidence, events, context retrieval, identity access, cognitive state, intentions/deadlines, model sessions, capabilities/receipts, clock/scheduler, persistence/checkpoints, expressions and source permissions. Cancellation uses standard `AbortSignal`. Core modules import no Electron, Node, Win32, Chrome, renderer or provider code. These are narrow TypeScript ports, not a plugin registry or event bus.

Live adapters are `CognitiveSqlite` (persistence/checkpoints), `CognitiveFoundation` (scene initialization, dependency invalidation and bounded invocation/receipt metadata), `LegacyModelSessions` (current providers), and `hostScheduler`. Existing action, identity, context and expression implementations remain compatibility owners; their complete conversion to core ports is future work. There is no second cognition engine.

## Data and transactions

`<userData>/cognitive.sqlite` uses Electron's built-in `node:sqlite`. Electron 45 in this checkout reports Node 24.22.0 and SQLite 3.53.4. No additional SQLite native addon, ABI rebuild or ASAR unpack rule is needed. The writable database is outside the installed application's ASAR. Koffi's existing explicit native resources remain unchanged.

Schema 1 stores versioned current records; schema 2 adds indexed dependency edges with foreign-key cascade deletion. Startup checks integrity and rejects unsupported future versions. Upgrades run in one transaction with a verified pre-upgrade `VACUUM INTO` backup. Nested synchronous transactions use savepoints. Revisions reject duplicate/stale projection writes. Dependencies use source IDs or `kind:id` record references, with transitive invalidation. DELETE journaling plus FULL synchronous writes makes committed checkpoints recoverable without an independently copied WAL. Use the backup method for live snapshots rather than copying an open database.

Production uses two bounded checkpoints, one current invocation record and one latest action receipt. Life's existing bounded observations and attention candidates are saved together with source configuration and watermarks. World projections are computed from that authoritative checkpoint. No animation frames, background polling log or indefinite event stream is introduced. Generic record kinds for intentions, cognitive snapshots and memory are available but do not migrate those existing stores automatically.

## Provenance and privacy contract

Enabled sources are not dependencies. The assembler records sources of evidence admitted to the actual prompt; Last.fm familiarity, opt-in summaries and inherited scene/behavior dependencies are included separately. An empty enabled source cannot taint ordinary chat. Since the current providers cannot reliably prove which evidence influenced a generated sentence, any supplied source evidence conservatively makes the response source-derived. A model's own attribution claim is not sufficient to clear that dependency.

User-authored messages keep their own retention/private flags. Ordinary conversation and its learning queue continue while connections are active. Source-derived replies remain visible in saved Chat according to history permission, but are excluded from automatic memory/Honcho export and the persistent conversation checkpoint. The original `publicHistory` and Honcho exclusion filters remain intact. Screen/file action outputs also mark subsequent replies conservatively as `action:untrusted`.

Revocation cancels pending output before invalidating dependent scene entries, invocation metadata and generic dependency records. Life removes its source observations/candidates and updates source-specific learning workspaces through existing tombstone logic. Unrelated user conversation and approved memories are not cleared. The old behavior cache lacks per-fact dependency IDs; it is cleared on revocation, and source-derived behavior remains session-only. Its dependency set intentionally stays conservative until that cache is cleared. There is a one-time legacy behavior-cache reset because older snapshots cannot establish source lineage.

Legacy import files are retained after verified migration. Revocation scrubs derived conversation entries and source evidence from those retained files and disables revoked legacy source permissions so rollback cannot silently restore access. Privacy/history controls clear migrated checkpoints as applicable. Backups are local profile data and must be handled with the same retention/deletion care as the original profile; they are not automatically restored.

## Remaining coupling and overlaps

- `index.ts` still owns substantial attention, physical state and expression orchestration. This stage extracts startup/invalidation, not the entire host.
- `ConversationScene`, `CompanionScenes`, relationship and personal context overlap in working continuity, episodes and intentions. They have different evidence/retention rules and must not be collapsed into a generic summary blob.
- Behavior facts and journals are not yet partitioned by source. Source-aware suppression is confined to that compatibility cache, not all user learning.
- Settings and several JSON stores use older repair/debounce behavior. SQLite failures are not interpreted as a new profile, and existing JSON is not indiscriminately migrated.
- Stage2 and Stage3 polling cursors/OAuth state remain JSON and encrypted secret stores. Network cursor writes and local Life checkpoint writes are not one cross-system transaction; provider revision/watermark checks remain essential.
- The model-session port does not implement persistent Luna/App Server sessions. The invocation record is metadata, not resumable provider context.

The next stages should replace compatibility owners incrementally using these contracts. Do not introduce parallel initiative engines, broaden source learning permissions or replace the cumulative `docs/DIALOGUE_GUIDE.md`.

## Storage references

The implementation choice follows the [Node 24 SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html), [SQLite backup guidance](https://sqlite.org/backup.html), and Electron's [native addon packaging considerations](https://www.electronjs.org/docs/latest/tutorial/native-code-and-electron). Runtime checks in this checkout are the controlling evidence for compatibility.
