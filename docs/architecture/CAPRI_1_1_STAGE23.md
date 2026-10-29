# Capri 1.1 Stage 2/3: execution, world authority and reconciliation

This continues Stage 1 (`73ec57b`) on the existing integration branch. It is a
source migration, not a replacement cognitive framework or an installed 1.1
release. Product version remains 1.0.0 until release acceptance.

## Execution authority

`CognitiveFoundation.capabilities` constructs the single production
`TypedCapabilityExecutor`. Conversation's existing action registry,
`AgencyRuntime`'s `SkillExecutor` adapter, and cognitive effect dispatch all use
that same object. The application integration test checks object identity, an
actual saved-note effect, its durable receipt and replay rejection.

The registry still owns the existing tools and their schemas. Executable tool
definitions are module-private. `runAction` reparses input and reads current
permissions internally, even if its caller forges a PreparedAction's policy.
Tools have explicit adapter preconditions, absolute execution deadlines,
request identity, argument fingerprints, dependency provenance and verification.
`capabilityContract` describes the policy/recovery contract for each registered
tool. Computer use always requires explicit confirmation, even if an old settings
file contains `allow`. Untrusted action results still escalate later actions.

The shared executor's outcomes distinguish completed, dispatched, denied, failed,
cancelled and unknown. Queuing an expression or considering an opportunity does
not prove renderer delivery or physical arrival. Native verified movement and
Agency skill receipts continue to establish physical outcomes. Cognitive
settlement consumes an agenda opportunity; it is not a user-visible success
claim. Model speech accompanying tool requests is withheld until execution.
Failed/declined tools deliver their actual outcome without a model rewriting it
into success. Successful one-shot effects can use the existing follow-up model
round. Model providers, native geometry checks and character performance remain
their existing owners.

The computer workflow's model `done` means only that its workflow ended.
Without independent task-specific confirmation, the result is explicitly
unverified/unknown. It cannot produce an authoritative successful capability
receipt. This intentionally closes the old false-success path; no credential or
additional integration is necessary.

The journal is a SQLite checkpoint containing bounded IDs, fingerprints,
dependencies and outcome metadata, never arguments, results or raw exception
content. Before dispatch it persists a replay barrier. A process loss leaves
that request unknown and prevents automatic replay. The same request ID with
different arguments is denied. Conversation derives stable tool request IDs
within each user turn, so repeated model requests do not duplicate timers or
notes; a fresh user turn can intentionally request another effect. In-flight duplicates are not run again. Private
and periodic cognitive dispatch metadata are volatile, including while another
request saves the shared journal. At 4,096 retained barriers the executor fails
closed instead of forgetting barriers. Existing clear-activity/history controls
clear this journal explicitly. Cancellation propagates to native computer work;
an action already in progress may have partial effects, which the receipt says
plainly. Permission and signal state are rechecked after execution.

## Durable agency

The existing XState `AgencyRuntime` still owns intention transitions, attention,
availability, physical ownership, recovery generations and deadlines. Its old
SkillExecutor is now a thin adapter to the common executor, rather than a second
permission/outcome implementation. Recovery revalidates geometry and executes
under a new recovery generation; it does not replay an old one-shot request.
Absolute deadlines survive restarts and suspend/resume. Timer backing records
remain keyed by intention ID. Study timers use those durable timers in production.
Repeated active commitments with the same normalized text reuse the existing
intention. Distinct intentional timer requests remain possible.

Life candidates are retained evidence awaiting an appropriate consideration, not
promises that Capri has sent a communication. Existing availability gates defer
them without consuming model attempts. Delivery and acknowledgment are separate
states. No second scheduler or new XState implementation was introduced.

## Canonical world authority

`core/worldModel.ts` defines a small entity/assertion model and its reconciliation
rules. Life Context owns these assertions in its existing transactional SQLite
checkpoint. Its old event ledger remains source evidence, not a competing status
authority. `worldFacts` and the live `LifeContext.world` use the same canonical
reconciler. Existing current-context limits do not prevent a named correction
from resolving against older still-fresh assignment records.

Kinds cover people, projects, documents, assignments, meetings, communications,
activities/places, commitments and observations. Configured Life entities can
carry an optional kind without changing existing records. File records have
document identity and project associations; filenames do not establish progress
or geometric properties. Structured course/assignment identity supports matching
independent sources. Other observations keep source-scoped identity unless an
explicit association establishes a link. There is no generic graph database.

Each assertion carries source record and revision, entity and predicate,
asserted value, timestamp/expiry, verification class/confidence, dependencies,
retention permission, correction marker and supersession link. Independent
assertions survive disagreement; same-source revisions supersede only their own
record. Unknown never becomes a negative outcome. Corroborated inference is
distinct from explicit user statements and authoritative source records.
Contradictions retain the contributing evidence rather than selecting a winner.
Expired assertions lose current authority without creating an adverse outcome.

Deadlines and submission are separate predicates. A due notice establishes no
submission outcome. User reports remain user-reported, including through restart.
An explicit negative platform record may contradict a report; merely not seeing
a submission may not. A current user report suppresses subsequent unchanged
reminders. New meaningful contrary evidence remains eligible for consideration.
Corrections sharing a millisecond still receive monotonic revisions. Old events
are imported into assertions once by identity, and deletion tombstones cannot
reimport deleted records. A narrow direct project-status correction also updates
the existing attributed relationship development and closes/revises the relevant
cognitive subject immediately. Broader conversation learning continues normally.

## Memory ownership and privacy

| Owner | Authority and reconciliation |
| --- | --- |
| Life evidence/assertions | Current sourced claims and their reconciled status; permission, freshness, contradiction and deletion decisions |
| Agency | What Capri is committed to do, execution/recovery state and verified receipts; never proof of a user's completed assignment |
| Episodic scenes and Chat | Attributed historical events and delivered speech; remembered conversation is not current truth |
| Approved personal memory | User-approved durable facts/preferences; source observations and model inference cannot silently approve themselves |
| Relationship/project store | Attributed tastes, project developments and follow-up projection; explicit current named corrections apply synchronously |
| Character identity/guide | Foundational self-model and performance directions; learned Capri tastes stay distinct from user preferences |
| PersonalContext | Existing user-stated commitment/conditional-follow-up projection and controls; no new autonomous loop |
| Honcho | Derived long-term interpretation and relevant retrieval; current verified evidence and corrections outrank it |
| Persistent Luna/provider sessions | Provider-neutral conversation history/cache; current application blocks supersede old context; never an independent authority |

Unrelated personal and relationship records retain their original owners and
formats. Only assertion ownership and the execution journal use the existing
SQLite checkpoint infrastructure; there is no bulk migration of JSON memory.

Source-associated user reports borrow source identity and therefore retain that
dependency. Their supplying dependencies, including contradictory evidence, are
attached to model context even when only the report is selected. Revocation
removes the dependent assertion/report, cached world state and journal metadata,
aborts active dependent execution, and invokes existing scene/cognitive/session
invalidation and source-specific learned-memory deletion. Legacy import files
are scrubbed too. Event-level retention restrictions apply to assertions and to
reports borrowing their identity. Attribution that cannot be established fails
closed. The independently authored user Chat message remains in History.

Action history now carries context-source attribution, including untrusted
results; it cannot become an untagged derived-memory pathway. Conservative
source-derived learning/history exclusions otherwise remain in place. Replacing
them without complete per-record attribution would weaken privacy.

Legacy note, approved-memory and manual reminder sinks have no per-source
deletion contract. The executor therefore refuses source-tainted writes into
those sinks, even after tool confirmation, rather than silently dropping
dependencies. Ordinary independent user-authored writes remain available.
Source-aware deadline/communication follow-through stays in Life Context.
This is a deliberate fail-closed boundary, not a claim that those legacy stores
have gained precise source attribution.

Codex App Server transport, signed-in accounts, compaction, interruption,
deletion debt and source/private session isolation are retained. Explicit project
continuation and ordinary follow-ups retain the established conservative routing.
The cognitive core imports no Codex transport implementation.

## Verification and release boundary

Validation results and exact commands are recorded in
`CAPRI_1_1_STAGE23_VALIDATION.md`. Synthetic fixtures require no credentials,
account reconnection, manual setup or production profile access. Tests cover
homework follow-through, conflicting records, native stay/restart recovery,
deferred communication delivery/acknowledgment, project association/correction,
revocation through restart and legacy import, and action replay/failure/denial/
cancellation/provider outage. Existing provider-session and Honcho privacy
regressions remain part of the unit/integration suite.

Installation into the normal profile is a separate release operation. Follow
OPERATIONS.md and the existing stopped-profile backup/rollback process before
replacing the installed application. Building and testing a staged package does
not assert that the user's running Capri was updated.
