# Stage 2: durable agency and skills

Product 0.7.0 continues the uncommitted Stage 1 foundation. It does not replace
the existing profile, integrations, persona, source permissions or provider route.

## Ownership

`src/core/agency.ts` owns explicit intentions, their XState v5 actors, the physical
owner projection, social availability, the initiative lease, and deadline
reconciliation. `main/cognitive/agencyHost.ts` composes typed skills with native
operations. Electron lifecycle, DIP conversion, native window enumeration,
character presentation and actual placement remain host responsibilities.

The existing presence heartbeat is the single optional scheduling clock. Native
auto teleport no longer arms its own timer. BehaviorCore remains the sole optional
model decision owner and retains its source-aware compatibility cache. Screenshot
decisions, window tours, cursor visits, local adjustments, theatre and auto
teleport must claim the agency lease. Direct chat is independent of that lease.
Existing behavior eligibility, privacy and delivery gates still apply beneath it.
The existing reminder scheduler handles mandatory due notifications, not optional
initiative. Life source polling and memory learning retain their separate budgets.

## State machines and checkpoints

Each intention follows pending -> executing -> active, with explicit recovery,
failure, retry, cancellation and completion transitions. XState promise actors
carry AbortSignal into skill execution. Cancellation stops the invocation; a
placement revision also invalidates stale native callbacks. New movement cancels
the former physical owner. A user drag cancels that ownership at the existing
four-DIP lift threshold, while an ordinary click leaves it intact.

The `agency-v1` checkpoint atomically stores domain state, bounded receipts and
serializable XState persisted snapshots in Stage 1 SQLite. At most 32 live and
32 terminal intentions are retained, with eight recent receipts each. These are
operational commands and outcomes, not approved memories or Honcho material.
No animation frames, model transcript or credentials enter the checkpoint.

Recovery is deliberately explicit. Raw invoked-child snapshots and JS delayed
transitions are not replayed. A saved live intention starts in the stable
recovering state. The first heartbeat compares its absolute wall-clock deadline,
then revalidates the skill if time remains. Past-due stays complete without
movement. Timers use stable reminder IDs, so a crash between the native reminder
write and SQLite receipt can safely revalidate without adding a second timer.
Reminder JSON and SQLite are not one cross-file transaction. Stable idempotency
keys reconcile that boundary. Preexisting timers keep their original store and IDs.

Snapshot format is versioned separately from the product and SQL schema. Unknown
versions, invalid records and invalid durations are rejected, preserving the
checkpoint. Actor context contains data only. See the official
[XState v5 persistence documentation](https://stately.ai/docs/persistence).

## Stay at a chosen window

The local command parser handles:

`go lay in the codex window for 30 min while i finish my hw. i need to lock in`

It extracts the exact target query, 30-minute duration, lying preference and quiet
request. It never sends this command through a provider or treats window text as
an instruction. Native enumeration covers all monitors without focusing a target.
Exact app/title matches precede unique partial matches; ambiguity returns a
specificity/manual-placement request and preserves the previous commitment.

Native HWND, process and PID identify the chosen window. A changed title in that
same native process remains eligible; synthetic/legacy identities without a PID
also require the exact title. A closed/minimized target, reused handle or lost
exposure never selects another app. Failure is recorded and reported in Chat.
Restoring a stay requires the original native window to remain present. Reopening
the app under a new process requires a fresh command.

Geometry is converted from native pixels to Electron DIP before exposure checks.
The host first tries a supported lower edge for lying, then an exposed safe top
perch. A supported perch is an allowed fallback, not a claim of lying when support
does not permit it. Placement uses native Capri window APIs, never pointer input.
Actual native bounds, correct attachment identity and fresh exposure checks must
agree before the skill emits a verified arrival receipt and activates the stay.

While pending, executing, recovering or active, the physical commitment suppresses
optional movement and unrelated initiative. Quiet additionally suppresses optional
dialogue. Direct chat remains usable. Return-to-cursor behavior is blocked. The
ordinary perch-follow loop yields to the agency owner; the heartbeat revalidates
the selected edge after window/monitor/size changes. Invalid locations fail visibly
and release the stay. Manual retry revalidates the same identity. Consecutive
failure retries are bounded; a fresh command can begin a new attempt.

Nonquiet stays retain existing doze/near-end presentation. Their one heads-up
delivery marker is durable. A quiet request wins over an optional heads-up.
Expiration releases ownership; it never claims the user's homework is complete.

## Other skills and permissions

Skills define input parsing, permissions, preconditions, execution plans,
cancellation, verification, idempotence, bounded retry and recovery. Compensation
is an optional contract for future effects that need it; current native placement
does not undo a newer user's position during cancellation.

Implemented host skills: `stay_at_window`, `hold_position`, `quiet`, `avoid_window`,
`timer`, and `commitment`. Local controls and existing reminder/timer tools route
into them. A hold captures verified native coordinates; recovery checks safety.
Avoidance marks the selected window and verifies movement clear when needed.
`track my commitment to ...` records an acknowledged user commitment without
inventing progress. Cancellation, release and normal-mode commands have distinct
scope; returning to normal does not delete timers or acknowledged commitments.

The typed source distinguishes command, proposal, curiosity, background and
reminder. Curiosity requires an expiration and cannot authorize physical actions.
This stage does not persist BehaviorCore's source-derived interests as privileged
commands. Source-backed project summaries remain the existing user-authorized Life
and source-learning workflow; their output is not an action authorization.
General computer use retains its own existing permission/confirmation route.
LLM tool movement cannot violate an active stay. A direct local movement command
can explicitly replace it. No model statement is an arrival receipt.

Availability is separate from emotion: focused, available, leisure, game/call,
AFK, suspended and explicit quiet are supported states. The live adapter admits
native idle, native game classification and explicit controls. It does not infer
focused work or leisure from a title. Unsupported states stay ordinary rather
than claiming user intent. Suspend aborts movement; resume compares real deadlines
and revalidates before restoring physical effects.

## Observability and limits

Diagnostics include actor state, physical/attention ownership, last deadline
reconciliation, intention IDs, skill IDs, deadlines and receipt counts, without
operational text. Synthetic tests can inspect the actor runtime directly.

BehaviorCore's remaining compatibility interests are not a second durable action
engine. Their per-fact provenance migration, persistent Luna/App Server sessions,
and broader planning remain later-stage work. Native recovery is heartbeat-based,
so following is deliberately bounded rather than frame-by-frame tracking. A
persisted receipt proves the observed native outcome at that instant; continuing
validity is rechecked. OS notifications retain the existing reminder delivery
semantics rather than claiming exactly-once delivery across an OS crash.
