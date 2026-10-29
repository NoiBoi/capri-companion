# Capri 1.1 Stage 2/3 continuation

Current execution and world-model ownership is documented in [CAPRI_1_1_STAGE23.md](CAPRI_1_1_STAGE23.md), with validation in [CAPRI_1_1_STAGE23_VALIDATION.md](CAPRI_1_1_STAGE23_VALIDATION.md). This supersedes historical statements below that describe the action registry and Agency skill checks as separate production gateways or world status as only a transient projection. Continue the established CognitiveRuntime, AgencyRuntime and provider-session implementations. Product version remains 1.0.0 pending release; the installed application and normal profile have not been replaced by this source checkpoint.

---

# Capri 1.1 Stage 1: authoritative cognitive orchestration

This section supersedes the historical ownership descriptions below. Baseline is
`capri-lachy-integration` / `e593c51` (1.0.0). This is the first of three 1.1 stages;
the installed application and production profile are not replaced by this source migration.

| Owner | Responsibility | Boundary |
|---|---|---|
| `src/core/cognitiveRuntime.ts` | Cognitive state, event admission, bounded deferred agenda, subject lifecycle, initiative timing, priority selection, preemption generations and execution leases | Uses DomainEvent, Evidence, CognitiveState and Checkpoints; no Electron/native/browser/renderer imports |
| `src/core/presencePolicy.ts` | Environmental curiosity, new-window/video/cursor visits, return from AFK, physical/context cues, music novelty, auto teleport cadence, theatre and small activities | Converts one physical/evidence sample into proposals; the runtime selects one effect |
| `src/core/dialogueCognition.ts` | Shared operational conversational subject, attributed position, corrections, questions and closure | Constructed and owned by CognitiveRuntime; previous main path is a compatibility re-export |
| Existing `AgencyRuntime` | XState durable commitments, availability, attention and physical ownership actors, deadlines and verified skill execution | No second intention/availability state machine; runtime leases claim this existing attention actor |
| `BehaviorCore` | Bounded model inference, grounded evidence validation, provider budgets and compatibility checkpoint import | Its working situation is owned by CognitiveRuntime. Production initiation and cooldown delegate to that authority; optional dispatch without an admitted attention lease is rejected |
| `Conversation`, ConversationSessions | Direct/voice model transport and persistent Luna session delivery | User input preempts runtime effects and cancels optional physical work; direct and ambient prompts consume the same runtime and dialogue state |
| ConversationScene, CompanionScenes, RelationshipStore, PersonalContext, Life ledger | Attributed exchange, episodic evidence, tastes/projects, sourced personal opportunities and source validity | Supply evidence/projections; do not execute autonomous actions. Current source validity is checked again at delivery |
| Electron main and native adapters | Sampling, IPC, physical geometry, capability/permission observations, collection, effect execution, renderer delivery and receipts | No presence-policy selection; no native frame/cursor physics in the core |

Flow: host sample -> PresencePolicy proposals -> CognitiveRuntime evidence/revision
admission -> bounded priority agenda -> one typed effect -> host revalidation and
execution -> settlement. Periodic observations alone create no model opportunity.
Duplicate event/source/revision pairs are rejected, source timestamps and expiry
are validated, and newer evidence explicitly revises/reopens an existing subject.
Subject phases are introduced, investigated, discussed, revised, resolved and
abandoned. Dialogue closures and model decision outcomes update that same state.

Queued effects are rechecked against the current permitted capabilities, so disabling optional speech, inspection or a movement category defers its already queued work. Verified physical completion can create a subsequent optional context opportunity; it never directly starts another model request.

The runtime holds at most 32 subjects, 128 deduplication keys, 16 deferred
opportunities and 8 recent conclusions. Only one effect is pending. Direct
interaction invalidates its generation, releases optional attention, stops native
optional work, and preserves unrelated Agency commitments. Game/call, quiet/stay,
AFK, suspend, physical instability and host availability constrain the same gate.
Deferred evidence expires; restart restores valid cognitive state and deduplication
but never blindly replays an in-flight effect. Model failure settles once and does
not create an internal retry loop. Source-derived conclusions are labeled without
copying source content into the runtime checkpoint.

Compatibility paths to remove before all of 1.1 is complete:

- BehaviorCore still imports/exports `behavior-state.json` and owns evidence parsing,
  saturation, provider request budgeting and the model adapter. Its standalone
  initiative fallback remains for old isolated callers without a CognitiveRuntime.
  The production composition always supplies the runtime.
- The host's `claim`/`release` adapters for existing outings and physical executors
  remain, routed exclusively through CognitiveRuntime. Convert these to full
  capability request/receipt adapters in later stages; do not restore direct host
  Agency attention claims or independent ambient schedulers.
- `generatedRemark` still collects native screenshots/media, constructs the legacy
  model event and revalidates geometry, exchange revision and source permissions.
  It delegates eligibility and initiative timing to the core. Native route/landing
  feasibility and ongoing movement cancellation stay in the host.
- TeleportController still exposes dormant startAuto/rearm/autoTick compatibility APIs. Production does not start their timer, and the native adapter rejects automatic movement without a CognitiveRuntime execution lease. Remove the dormant scheduler API before the complete 1.1 release.
- Host aliases expose core-owned cadence objects to existing physical executors
  and diagnostics. `src/main/cognitive/dialogue.ts` is a compatibility import path.
- Stage 3 character-performance overhaul, release packaging/installation and live
  account/model acceptance are separate work. Existing PerformanceDirector,
  renderer animation, integrations, persistent providers and profile formats remain.

Outing goal, target ranking and manner selection use the core-owned ExplorationDirector through CognitiveRuntime.chooseOuting; native geometry is supplied as feasible place descriptors. A model-requested investigation queues a later typed movement opportunity instead of moving from the model callback. Delayed placement continuations carry their original interaction generation and cannot preempt a newer approved activity.

The CPU-sensitive cursor loop now samples pointer/input only. AFK return and
native auto teleport scheduling were removed from their second host paths.
Optional presentation without a runtime effect/lease is refused, and an optional
BehaviorCore request without admitted cognitive attention cannot call a model.

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
