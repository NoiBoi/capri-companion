# Current Stage 3 update: product 0.8.0

Read [STAGE3.md](STAGE3.md), [STAGE3_VALIDATION.md](STAGE3_VALIDATION.md) and
[STAGE4_HANDOFF.md](STAGE4_HANDOFF.md) for current session, cognition, privacy and
release ownership. Earlier descriptions below are preserved historical stage
records; references to persistent model sessions as future work are superseded.

# Stage 3 handoff

Read all architecture files, `docs/DIALOGUE_GUIDE.md`, and repository AGENTS.md.
Stage 1 and Stage 2 changes remain local in the established checkout. Keep both.
Product 0.7.0 is an intermediate migration release, not a Capri 1.0 completion claim.

## Main paths

- `src/core/agency.ts`: typed intentions and skills; XState promise invocations,
  ownership, availability, initiative arbitration, recovery and bounded checkpoint.
- `src/main/cognitive/agencyHost.ts`: skill permissions, verification and local
  command composition. `Company.durable` is a read projection, not another owner.
- `src/main/index.ts`: native placement/exposure and lifecycle adapters. The single
  presence heartbeat reconciles deadlines, follows the physical owner, then offers
  optional scheduling. It does not depend on provider availability.
- `src/main/actions/registry.ts`: existing timer/reminder tools adapted into durable
  execution. Other tools retain established permissions and confirmation behavior.
- `src/main/store/dataStores.ts`: stable-key reminder reconciliation.
- `tests/unit/agency.test.ts`, `tests/e2e/agency.e2e.test.ts`: state machine and
  actual native placement/restart tests. CAPRI_EXE runs the same fixture from ASAR.

## Preserve these invariants

Do not revive TeleportController's separate auto timer. New optional behaviors
must use the agency lease and existing delivery/privacy gates. Do not bypass
direct user interaction with an optional lease. Do not promote source-derived
BehaviorCore interests, project summaries or model success statements into action
authorization or verified receipts.

Raw XState snapshots are diagnostic/recovery evidence, not permission to replay
invocations. Keep the versioned domain recovery policy and compare absolute
deadlines on startup/resume. Recheck permissions and identity before native effects.
Never bind a stay to an arbitrary matching app after its target disappears.

Keep source revocation, Honcho deletion and approved identity separate from the
operational checkpoint. Preserve the current home-relative Documents profile
selection and original encrypted-secret handling. The older memory note referring
only to AppData is not the controlling profile path in this checkout.

## Reproduce

Run typecheck, the unit suite with two workers, build, then the agency Electron
fixture and relevant compatibility suites. Build/package using `npm run dist`.
Repeat native agency, foundation, integrations and profile tests against
`release-staged/win-unpacked/Capri Buddy.exe` through CAPRI_EXE, in isolation.
Use a stopped-profile backup and rollback application before replacing the live
portable build. Verify the normal Desktop shortcut after replacement.

## Continue carefully

Migrate further capability owners incrementally. A schema and plan alone are not
verification: each new effect needs a real deterministic receipt. Add compensation
only when its effect can safely be undone without reversing a newer user override.
Keep background tasks bounded, source-linked and separately authorized. Project
summaries already have explicit source permissions; preserve that route rather
than creating a competing project watcher.

Provider-neutral persistent sessions remain future work. Keep working ephemeral
Codex CLI invocations, settings, native movement, memories, Chrome pairing and
integrations available during the next migration.
