# Capri 1.1 completion

Current ownership, migration and verification are in ARCHITECTURE.md, MIGRATION.md, STATUS.md, FINAL_REPORT.md and SCENARIO_RESULTS.md. Product version is 1.1.0. The staged release is separately verified; the installed normal-profile application was not replaced. All older handoffs below are historical and their remaining-work statements are superseded by the current report.

---

# Capri 1.1 Stage 2/3 continuation

Current execution and world-model ownership is documented in [CAPRI_1_1_STAGE23.md](CAPRI_1_1_STAGE23.md), with validation in [CAPRI_1_1_STAGE23_VALIDATION.md](CAPRI_1_1_STAGE23_VALIDATION.md). This supersedes historical statements below that describe the action registry and Agency skill checks as separate production gateways or world status as only a transient projection. Continue the established CognitiveRuntime, AgencyRuntime and provider-session implementations. Product version remains 1.0.0 pending release; the installed application and normal profile have not been replaced by this source checkpoint.

---

# Capri 1.1 Stage 1 continuation

Continue from the current branch, preserving the 1.0.0 baseline and its later
history. Read the new ownership map at the start of `ARCHITECTURE.md`; the older
stage entries below are historical. Product version is deliberately still 1.0.0:
this source checkpoint is Stage 1 of the three-stage 1.1 migration, not an installed
1.1 release.

CognitiveRuntime is composed before BehaviorCore and Conversation. It owns the
portable DialogueCognition instance, the model's shared working situation,
bounded event/subject/agenda state, initiative clock and preemption generations.
Outing goal/target/manner selection is core-owned. Model-requested investigation
queues another typed effect; delayed user-placement reactions keep the original
interaction generation. Do not turn such a continuation into a new user event.
PresencePolicy owns pure cadence components; host aliases are for executor
continuity and diagnostics. AgencyRuntime is attached after native adapters exist
and remains the sole XState durable-intention and availability implementation.

`presenceTick` samples current windows, permissions, native state, source
candidates and playback, then executes one selected effect. High-frequency pointer
tracking, physics, target geometry and skill verification remain native. Do not
add another presence scheduler to cursorTick, restart TeleportController's dormant
legacy auto timer, or claim Agency attention directly from a host callback.

Compatibility work remaining before the complete 1.1 release:

1. Replace legacy generatedRemark/model-event collection and the physical
   claim/release entry adapters with full typed capability receipts. Preserve
   source permission, scene/placement revision and geometry revalidation.
2. Retire BehaviorCore's standalone admission fallback and JSON checkpoint adapter
   once every standalone caller migrates. Production already supplies the cognitive
   authority; its model state is a reference owned by that runtime.
3. Remove the old DialogueCognition import-path shim and host cadence aliases when
   diagnostics/executors move. Avoid a duplicate XState machine or second topic
   lifecycle. ConversationScene and relationship/episodic stores remain evidence
   projections and durable attributed records, not autonomous executors.
4. Stage 3 may refine coordinated character performance. Keep the current
   PerformanceDirector, renderer/native behavior and personality guide in place.
5. Package/install only after the release workflow, stopped-profile backup and
   rollback checks. This stage did not modify the installed app or reconnect any
   account. Live persistent Luna/provider verification is separate from local
   mocked-provider and offline integration evidence.

Verification commands: `npm run typecheck`, `npm run test:cognitive`, `npm test`,
`npm run build:prod`, and `npm run test:e2e`. New regression fixtures explicitly
acquire cognitive attention before injecting optional delivery/model decisions;
the separate negative tests verify that bypass calls are rejected. Keep these
admissions visible in tests instead of disabling the runtime gate.

Final verification: 713 unit tests and 24 runtime sequence cases pass; 18 affected
desktop cases, 62 focused integration cases and 8 final source-validity/restart
cases pass. Read COGNITIVE_RUNTIME_VALIDATION.json for the non-green broad run and
three native failures reproduced on the untouched e593c51 baseline. Do not relabel
the full desktop suite green or infer packaged/live-provider acceptance.

---

# Final Stage 5/6 handoff: Capri 1.0.0

Implementation and release are complete with the verification scope in FINAL_REPORT.md. Use OPERATIONS.md for setup, privacy and rollback. Keep all earlier stage records as historical evidence. Do not restart from the 0.3.0 memory summary or assume AppData is the current profile: normal data is Documents/Capri Buddy. Architectural checkpoints: 289e34f baseline, 2c498ed Milestone A, dd90560 two-day corrections, da90aa8 stabilization. The final source/report checkpoint follows these. No private backup belongs in a public artifact.

The actual installed app loaded all 40 approved memories and known-name state, with no settings repairs and Codex connected. Its normal Memory panel renders and retains Honcho state. The ordinary shortcut relaunch after a full normal quit reports readiness in 462 ms. See the recorded initial hidden-style startup failure before assuming every launch was successful. The accelerated scenario and synthetic source fixtures do not prove an actual two-day live-source workload.

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

# Current handoff: Stage 3

Stage 2 is implemented in product 0.7.0. Start with
[STAGE3_HANDOFF.md](STAGE3_HANDOFF.md), [STAGE2.md](STAGE2.md), and the latest STATUS.
The original handoff below records the Stage 1 foundation. Its intention and
capability work items are superseded by Stage 2, while its provenance and provider
session cautions remain relevant.

## Historical handoff from Stage 1
# Handoff to Stage 2

## Start here

Read `ARCHITECTURE.md`, `MIGRATION.md`, `STATUS.md` and the existing `docs/DIALOGUE_GUIDE.md`. Continue from the existing `capri-lachy-integration` lineage; preserve the connections Stage2/Stage3 implementation already present. Product 0.6.0 is not a claim that Capri 1.0 or later architectural stages are complete.

## Implemented foundation

- Host-independent domain contracts and tested pure retention/revocation logic in `src/core`.
- SQLite current-state/dependency adapter with migrations, integrity checking, verified backups, savepoints, monotonic revisions and transitive invalidation.
- Authoritative transactional scene and Life checkpoints, including observations, computed projection inputs, attention candidates and source watermarks.
- Extracted host composition/invalidation in `main/cognitive/foundation.ts`.
- Existing-provider session adapter and scheduler adapter in `main/cognitive/runtime.ts`.
- Bounded invocation/receipt metadata; request source dependencies and source-specific revocation.
- Ordinary user-message learning stays active alongside connections, while source-derived scene/assistant evidence remains excluded.

## Next responsibilities

1. Move cognitive state/intention transitions behind the core ports. Integrate existing personal commitments, experience wants and BehaviorCore interests without running a second initiative loop. Keep actual host action outcomes separate from intentions.
2. Replace the unpartitioned behavior cache with evidence-linked facts, interpretations and intentions. At that point its conservative cache clearing and source-set inheritance can become per-record invalidation.
3. Adapt identity/context/capability/expression owners incrementally to the published contracts. The ports exist; these owners have not all been rewritten to implement them.
4. Implement provider-neutral persistent model sessions and the intended Luna/Codex App Server adapter in the later designated stage. Current Codex uses ephemeral CLI execution with existing login and disabled native tools. Preserve that working route during migration.
5. Add persistent session dependency invalidation before introducing any retained provider context. Current invocation metadata is not a resumable thread.
6. If migrating another JSON owner, define its authority switch, import marker, privacy behavior and recovery fixture first. Do not double-write competing authorities or bulk import all profile files.
7. Extend capability receipts and idempotence deliberately before action replay. The latest receipt is bounded audit metadata; it does not authorize retries or prove that an action is safe to repeat.

## Reproduction

Run `npm run typecheck`, `npm test`, `npm run build`, then the relevant Electron suites. `tests/unit/cognitiveFoundation.test.ts` needs no Electron. `tests/e2e/cognitiveFoundation.e2e.test.ts` launches synthetic profiles and exercises built-in SQLite in the actual Electron main process. Set `CAPRI_EXE` to the staged executable to repeat that check against ASAR packaging. Run timing-sensitive packaged suites in isolation. See STATUS for exact run results and limitations.

Build with `npm run dist`; output is staged so a running portable installation is not replaced. No personal credentials or production profile are required for synthetic checks. Installation/replacement is a separate release operation requiring a stopped-profile backup and rollback executable. Do not claim the user's live desktop copy changed merely because an installer was built.
