# Stage 4 continuation completed

Stage 4 is now product 0.9.0. Continue with [STAGE5_HANDOFF.md](STAGE5_HANDOFF.md).
The original Stage 3 to Stage 4 handoff below is historical.

# Stage 4 handoff

Stage 3 is implemented in product 0.8.0. Read STAGE3.md, STAGE3_VALIDATION.md,
ARCHITECTURE.md, STAGE2.md and the cumulative docs/DIALOGUE_GUIDE.md. Keep all
preexisting local Stage 1/2 work. Source changes remain uncommitted.

## Preserve

The normal profile is selected by profileDirectory, currently Documents/Capri Buddy.
Do not switch back to an old AppData-only assumption. Approved memories, secrets,
Honcho, settings, character assets, action policies and the durable physical actor
remain in their existing owners. Do not add another background initiative loop.
BehaviorCore remains the sole optional model decision path. Its remaining
unpartitioned compatibility cache is still conservative about source invalidation.

Application history and actual delivery are authoritative. Never clear a session's
in-flight marker before the application record is appended. Never resume a revoked,
private, source-derived or uncommitted native thread. Deletion debt is real state;
archiving or compacting is not deletion. Keep ephemeral provider copies separate
from long-lived project context. Current explicit corrections beat historical
quotes; learned tastes require Capri's delivered evidence, not third-party claims.

## Main paths

- core/modelSessions.ts, main/ai/codexSessions.ts: session lifecycle and protocol.
- main/cognitive/conversationSessions.ts: routing, context updates, recovery.
- main/cognitive/dialogue.ts: small operational conversation model.
- main/store/relationship.ts: learned self-model and bounded preference changes.
- main/ai/persona.ts, shared/capriVoice.ts, docs/DIALOGUE_GUIDE.md: character logic.
- main/index.ts: existing delivery, privacy and capability composition.

## Reproduce

Run npm run typecheck, npm test -- --maxWorkers=2, and npm run build. Run
modelSessions unit fixtures and dialogueSessions/cognitiveFoundation/agency/scene
Electron suites. Package with npm run dist, then run those fixtures with CAPRI_EXE
pointing to release-staged/win-unpacked/Capri Buddy.exe, serially.

The scripts stage3-eval.ts, stage3-cognitive-eval.ts, stage3-lifecycle.ts,
stage3-fork.ts, stage3-tool-audit.ts and stage3-failures.ts preserve synthetic first attempts and lifecycle evidence. Bundle
with esbuild, platform=node, format=esm, loader:.md=text and an ESM createRequire
banner, then pass a JSONL output path. The eval/lifecycle scripts use real account
allowance. The tool/failure scripts use local mock endpoints and require no keys.
The latter are protocol checks, never evidence of model dialogue quality.

## Next-stage concerns

Follow the user's Stage 4 specification when supplied. This handoff does not invent
its scope. Useful remaining architecture work includes per-fact BehaviorCore
provenance, broader capability-port migration and calibrated semantic evaluation.
Keep the current actor's native cancellation/focus/quiet boundaries. Existing
focus restoration and relationship-callback baseline failures are recorded in
Stage 2; do not hide them behind a green targeted Stage 3 selection.

Dialogue heuristics are intentionally small. They can close a question
provisionally rather than understanding every answer; short user quotes are a
subject fallback. The live evaluation includes bland or unnecessary callbacks.
Do not solve those by always muting Capri, always adding a second model pass,
inventing memories, or promoting inferred motives into characterization facts.
