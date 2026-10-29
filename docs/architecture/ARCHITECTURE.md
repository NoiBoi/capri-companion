# Capri 1.1 architecture

This is the current ownership map, superseding the earlier stages. Historical architecture is retained in [history/ARCHITECTURE_PRE_1_1.md](history/ARCHITECTURE_PRE_1_1.md). The source lineage is e593c51 (1.0), 73ec57b (1.1 Stage 1), fdd9e85 (Stage 2), followed by this Stage 3 commit. No new actor framework was introduced.

## Authoritative ownership

| Component | Owns | Does not own |
| --- | --- | --- |
| core/CognitiveRuntime | Bounded subjects and deferred agenda, priority, initiative clock, generation/preemption, execution leases, working-situation persistence; constructs DialogueCognition, PresencePolicy and PerformanceDirector | Native geometry, account transport, approved profile facts |
| core/PresencePolicy | Curiosity, novelty, cursor/new-window/video visits, music changes, activity and teleport cadence as proposals | Timers or native execution; it has no independent loop |
| core/DialogueCognition | Attributed positions, reasons, questions, changes, criticism, closures and operational conversational intentions | Invented tastes or user facts; enduring tastes stay in RelationshipStore |
| core/PerformanceDirector | Presentation intention, ordered facial-expression/speech beats, silence, quiet stationary-expression policy and generation-checked action/continuation settlement | Treating a request, elapsed timer or model narration as completed animation/movement |
| core/AgencyRuntime | Existing XState durable intentions, availability, attention, physical ownership, absolute deadlines, recovery generations and receipts | A second independent optional-initiative scheduler |
| core/TypedCapabilityExecutor | Single production permission, deadline, cancellation, provenance and replay gateway | Tool implementation or a model's unverified success narrative |
| BehaviorCore | One bounded optional model interpretation and validated expression for an admitted event; request budget, cancellation and evidence validation | Its own state store, initiative clock or attention authority; cognition is a required dependency |
| Conversation / ConversationSessions | Direct conversational transport, application delivery and persistent provider-session routing/rotation | Autonomous initiative or current-world truth from remembered history |
| MemoryLearning | Existing budgeted, delayed learning batch; selectively includes cognitive interpretation in that same request | An extra model pass on every answer; approved facts invented from an assistant/source |
| LifeContext / worldModel | Sourced assertions, freshness, contradiction, revocation, delivery/acknowledgment and candidate evidence | Proof of submission, exercise, reading or progress from absence/metadata |
| RelationshipStore / CompanionScenes / PersonalContext | Existing attributed character tastes, project continuity, shared episodes and user-stated commitment projections | Another autonomous executor; cognitive thoughts reference delivered evidence rather than duplicating approved memories |
| ConversationScene / History | Dated delivered exchange and provenance; historical transcript | Competing production scene interpretation; obsolete derived reading is retired |
| Honcho | Optional derived retrieval with existing privacy/deletion barriers | Overriding current verified evidence or user correction |
| Electron host / native / renderer | Lifecycle, OS polling, window safety/geometry, animations, physics, TTS, IPC, execution and actual acknowledgments | Selecting optional cognitive priorities independently |

## Live flow

The existing one-second host heartbeat samples native/source state. PresencePolicy and evidence owners supply proposals. CognitiveRuntime admits evidence/revisions and chooses one effect. The common capability executor revalidates it. PerformanceDirector checks native execution before an optional continuation; native adapters retain geometry and cancellation checks. Only delivered text/audio or actual animation/native receipts establishes an outcome. Generation changes invalidate late work.

Follow-up priorities formerly assembled in index.ts now live in CognitiveRuntime.contextOpportunities. Host aliases of presence objects support native geometry/diagnostics; they are references to the runtime's objects. EnvironmentalCuriosity and outing selection have no independent host owner. Native follow, drag, support loss, safe landing and explicitly authorized computer work remain low-level execution.

The action registry is module-private tool implementation/schema and adapter policy. Conversation, Agency's thin SkillExecutor adapter and cognitive effects share CognitiveFoundation.capabilities. Existing capabilityMigration integration checks object identity, real effects, durable receipts and replay rejection. An alternate model-tool path cannot bypass it.

## Evidence-grounded cognition

Cheap closure/correction handling and basic quote extraction remain synchronous. Meaningful batched interpretation uses the existing MemoryLearning call only when new evidence warrants it. It is optional when learning/history is disabled or the provider is unavailable; normal conversational continuity uses the persistent Luna session.

The structured delta names a topic, kind, lifecycle status and exact source citations. Positions/reasons/new questions/intentions require delivered assistant evidence. A user may resolve an already existing question/intention, but cannot manufacture a new Capri position by asserting it. Separate reason citations preserve an actual rationale. Revision and evidence-snapshot checks reject stale, forged, private, interrupted and source-derived updates. Earlier versions of a view retain attributed quotes. Topic closure does not abandon unrelated deferred obligations. Stable tastes and shared experiences retain their existing owners.

Limits: 12 operational thoughts, 16 extraction-evidence messages (1,800 characters each), six lexical questions, five changes and eight temporary subject closures. Extraction evidence is omitted from ordinary prompts; cognitive and conversational prompt blocks are no longer duplicated. A heuristic remains a cheap fallback, not a claim of universal semantic understanding.

## Embodiment and provenance

A validated model decision carries its reason as the presentation intention. The planner coordinates an available reaction and speech, or selects silence. The host executes those beats with existing assets. Explicit quiet suppresses speech while retaining local body/idle expression; game/call availability blocks optional intrusion and roaming. Renderer animation IDs remain requested until completed/interrupted, and expire without becoming success.

Native taskbar movement verifies final bounds before recording arrival or proposing a subsequent thought. Longer tours retain their proven host pauses and safe-route executor, with core target/manner and attention authority. Durable stays use existing Agency recovery and actual native bounds verification across monitors.

Speech provenance distinguishes authored IDs, generated direct/spontaneous, action results and system errors. Only authored IDs can be retired, before punctuation normalization. Generated feedback contains category/time, never a global phrase ban. Legacy generated exclusions migrate to bounded diagnostics; recognized authored entries retain their stable IDs.

## Authority evidence

- characterCognition.e2e: actual chat -> one learning request -> attributed revised thought -> restart; runtime/director object identity; no legacy automatic scheduler; generated feedback and ID retirement boundaries.
- cognitiveRuntime.e2e and capabilityMigration.e2e: no optional model/native bypass, one common executor, preemption, receipts and replay.
- dayInLife: real runtime, Agency, common executor, LifeContext and SQLite over a virtual 48 hours; synthetic native receipts are explicitly labeled.
- characterCognition unit cases: unsupported/future/stale/role-mismatched evidence rejected, existing questions resolved from user answers, privacy/restart and real performance outcome transitions.
- Native Windows and genuine Luna results, including failures, are in [FINAL_REPORT.md](FINAL_REPORT.md).
