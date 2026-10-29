# Stages 5/6 compatibility

No production profile reset or credential migration is required. SQLite schema remains version 2; the new performance-feedback checkpoint and optional conversational closure fields are additive. Existing identity, conversation history, Honcho state, integrations, encrypted secrets and artwork retain their owners. Old source caches and migration backups are preserved except when the user explicitly revokes/clears their content through existing controls.

New retired authored items add lineId. Existing retired expression records have no lineId and remain valid legacy exclusions until restored. The migration does not reinterpret generated phrases as authored templates or silently discard user preferences. New generated feedback never appends a text blacklist. Old chat messages without provenance remain visible but do not acquire an invented authored/generated classification. New messages persist explicit provenance through restart.

Only the unused hostScheduler helper was retired. Stateless provider compatibility, existing movement/physics/pose executors, background request budgets and action authorization remain active and verified through their existing interfaces. Removal of those mechanisms would be a regression, not architectural cleanup.

Use the stopped-profile backup and application rollback procedure in OPERATIONS.md. Exact final deployment and preservation evidence is recorded in FINAL_REPORT.md.

# Current Stage 3 update: product 0.8.0

Read [STAGE3.md](STAGE3.md), [STAGE3_VALIDATION.md](STAGE3_VALIDATION.md) and
[STAGE4_HANDOFF.md](STAGE4_HANDOFF.md) for current session, cognition, privacy and
release ownership. Earlier descriptions below are preserved historical stage
records; references to persistent model sessions as future work are superseded.

# Stage 2 migration and recovery

The new `agency-v1` SQLite checkpoint owns operational intentions, bounded receipts
and diagnostic XState snapshots. Stage 1 conversation/Life checkpoints and their
source-revocation rules remain authoritative. No bulk profile migration is added.
Existing reminders remain in their store; new skill-created timers use stable IDs
for crash reconciliation across JSON and SQLite. Original timer IDs are preserved.

Read [STAGE2.md](STAGE2.md) before changing recovery. Restore stable domain states,
compare absolute deadlines, and revalidate effects. Do not replay raw invoked-child
snapshots or assume a saved JavaScript timer will resume. A lost native target is
a visible failure, not permission to select another application. Full reset clears
the operational checkpoint as well as the existing profile owners. History clearing
cancels the operational activity; ongoing timers retain explicit cancellation paths.

Use the actual shared profile selected by `profileDirectory`, currently
`C:/Users/matth/Documents/Capri Buddy`. Back up that stopped profile as a unit before
application replacement. Keep the complete previous unpacked application for
rollback. Never independently roll back encrypted credentials or source permissions.

## Preserved Stage 1 recovery contract
# Stage 1 migration and recovery

## Ownership changes

| Data | Authoritative after startup | Compatibility behavior |
| --- | --- | --- |
| Immediate shared scene | SQLite `checkpoint/conversation-scene` | Import existing validated `conversation-scene.json` once; retain JSON. Import marker prevents cleared scenes from resurrecting. Source-derived entries are session-only. |
| Life sources, retained observations, revision watermarks, attention candidates | SQLite `checkpoint/life-context` | Import validated `life-context.json` when no SQLite checkpoint exists. Constructors save the initialized checkpoint in the composition transaction. Existing adapters still use LifeContext's API. |
| Model invocation metadata | SQLite `session/current-chat` | One bounded record, no prompt/provider conversation transcript. Source-dependent invocation metadata is invalidated on revocation. |
| Completed/failed action metadata | SQLite `receipt/latest` | One bounded latest receipt, no action arguments or outputs. Existing action history/UI remains. |
| Approved memories, relationship, personal context, episodes, settings, history, reminders, notes, secrets | Existing stores | No migration or credential replacement. |
| Stage2/Stage3 configs, OAuth/poll cursors and Honcho deletion ledgers | Existing stores | Keep source-specific deletion and opt-in learning semantics. |

SQLite schema versions are independent of the product's version number. Keep Electron and its Node SQLite API verified together. No installer data-reset operation is added.

## Initialization and writes

1. Open the database under the selected user-data directory, check integrity and reject newer schemas.
2. Back up an existing older SQL schema through `VACUUM INTO`, verify that backup, then migrate transactionally.
3. Initialize/import the bounded scene and import marker in one transaction.
4. Initialize Life and existing Stage2/Stage3 registrations in a composition transaction. All retained Life records and watermarks share its checkpoint.
5. Leave original JSON available for review/rollback. Future writes use SQLite for the migrated slices. Revocation sanitizes retained legacy copies.

Do not edit a retained JSON file expecting the new runtime to import it again. Do not delete an import marker to recover state. Full profile reset/history clearing uses the existing UI paths and also clears the corresponding current SQLite activity records.

## Backups and rollback

For a live snapshot call `CognitiveSqlite.backup(target)` with a new, explicit destination. The method rejects overwriting an existing backup and checks the copy. Before manual file restoration stop the application and preserve the current database and any journal alongside the rest of the profile. Restore only a backup whose schema and integrity are understood. No automatic fallback replaces a corrupt database with blank state.

A corrupt or future-schema database produces a startup error while preserving its bytes. Recovery requires selecting a verified backup or a compatible application version. Retained legacy JSON is not a complete ongoing rollback snapshot; older versions do not know the new authoritative checkpoints. For an application rollback, preserve the new database and use an explicit stopped-profile snapshot rather than expecting old code to reconstruct new conversations from stale JSON. Recheck source permissions before any older runtime resumes collecting. Never roll back encrypted credentials independently of the profile that owns them.

Pre-upgrade backups are operator recovery artifacts. Restoring one can resurrect state intentionally deleted later, so it must never happen automatically or bypass deletion tombstones. Ordinary runtime writes do not create rotating private-data copies.

## Privacy invariants

- Collection, live context, proactive context, local retention and long-term learning stay separate.
- Ordinary user messages remain eligible according to their own private/history/memory controls, including when sources are connected.
- A generated reply supplied external evidence cannot be promoted into native memory because the model claims it did not use it.
- Source-derived scene entries and readings supported only by them do not enter durable conversation checkpoints or memory-extraction inputs.
- Source invalidation is selective for scenes, transactional records and source learning. The unpartitioned legacy behavior cache is the documented conservative exception.
- Native Honcho's session is not rotated merely because a Chrome/project source changes. Source summaries have their own existing opt-in workspaces and durable deletion queues.
- Private exchanges and action outputs retain the existing export exclusions.

## Validation fixtures

All new fixtures use synthetic messages, URLs and profiles. Unit cases cover upgrades, future/corrupt stores, verified backups, partial writes, nested rollback, abrupt process termination, restart, correction ordering, source revocation, nonretained evidence and coexistence with old stores. The Electron fixture repeats SQLite, scene, Life, metadata and profile checks in the actual runtime. The same fixture is suitable for `CAPRI_EXE` against a packaged executable.
