# Stage 4: semantic perception and social attention

Product 0.9.0 extends the existing cognitive foundation, XState agency, session
runtime and Life checkpoint. There is no additional reasoning scheduler or model
provider. External accounts may remain disconnected. Perception admission,
normalization, deduplication, retrieval, deadline reconciliation and availability
updates make zero model calls. Optional interpretation still uses BehaviorCore,
its agency lease, cancellation, delivery gates and BackgroundBudget.

## Chrome reading

The existing extensions/chrome path, manifest permissions, pairing token storage,
extension origin checks and exact site grants are preserved. The manifest version
is 1.1.0. Reload an already loaded unpacked extension to run its new code. Do not
generate another pairing token just to upgrade. No additional host authorization
is required for an existing approved site.

The popup provides metadata, explicitly enabled passive semantic reading per site,
and deeper reading once on request. Selected text and legacy excerpts remain.
Capri independently requires collection, content permission and the same allowed
origin. Passive reading defaults off for existing grants. It is capped at one
extraction per 30 seconds and 120 per hour in the existing event/freshness lane.
Direct reading requests are explicit user actions and do not run a background
model. Failed bridge requests retain the existing exponential backoff.

The isolated-world extractor reads rendered main/article regions and bounded
Wikipedia/GitHub roots. It captures heading paths, paragraphs, lists, table rows
and visible code. It excludes forms, inputs, editable regions, navigation, hidden
descendants and credentials. Password/payment/authentication pages remain blocked.
Unsafe selections crossing a form are rejected. Poorly structured applications
return metadata rather than invented text. PDFs and screenshots are not silently
converted into readable documents; the existing authorized screenshot capability
remains separate.

Passive extraction is bounded to 40 blocks / 18,000 characters; deeper reading to
80 blocks / 48,000 characters. The receiver validates schemas, timing and revision
watermarks, accepts at most 256 KB per authenticated request and scrubs credentials
again. Structural/content hashes exclude focus, scroll and transport revisions.
Approved content snapshots are local, source-attributed and bounded to 24 documents
of 48,000 characters each. Only retained/content-approved sources reach the
transactional Life checkpoint. Revocation removes snapshots, queue entries and
source evidence together. Volatile content is never written to that checkpoint.

ContextAssembler retrieves up to four matching sections from at most two recent
documents, within its existing 3,600-character source evidence ceiling and total
context budget. Larger pages are never inserted wholesale. Native user reports
have their own attribution and do not falsely acquire an external dependency.

Authorized visible YouTube video elements provide playing/paused/ended state,
sampled playhead and duration. These samples expire after 45 seconds. Metadata-only
access collects no playback state. Neither an open tab nor a changing playhead
establishes user attention or accumulated watching duration.

## Evidence and world projections

life/perception.ts builds typed assignment, meeting, project, place, communication,
session and commitment projections with evidence IDs, revisions, timestamps,
expiration and optional deadlines. These projections enter the same context
assembler and sourced-development decision payload. Source deletions and existing
watermarks remain authoritative. Projection calculation has no model dependency.

Observed records, user reports, tentative communication claims, unknown outcomes,
structured independent corroboration and conflicts are distinct. Shared assignment
identity requires a structured course and assignment. An assigned/due state is not
a contradiction of a later submitted state. Viewing homework does not establish
submission; an email receipt is a source claim, not an authoritative platform
record. Manual academic imports are user-reported. A canonical platform submission
record can represent authoritative evidence, but no unsupported live Gradescope API
is claimed. Existing manual imports remain the available academic adapter.

Direct statements naming an unambiguous known assignment, such as “I already
submitted Homework 7”, become bounded user-reported operational records and resolve
its pending callback. Explicit negative corrections replace that report. Reports
require a real user message and never create approved memories or action receipts.
Private messages do not enter this path. Reports expire after 30 days, follow native
history persistence controls and survive external-source revocation as user evidence.
An unnamed acknowledgment can close one recent delivered academic callback without
inventing which platform status changed.

Project filenames establish folder-linked activity, not CAD geometry or success.
Phone geofences and PC input establish separate observations, not exercise or arrival
at home. Discord process/foreground metadata never proves a call. Only authorized
guild voice membership supports the call availability cue.

## Attention, deferral and saturation

The Stage 2 availability actor now receives explicit focus, native idle/game state,
authorized game foreground and guild voice membership, and authorized playback.
Evidence names remain diagnostic. Explicit quiet/focus wins; direct chat stays
interactive. A process name alone is not treated as voice-call evidence.

The durable Life candidate queue now stores importance, novelty, deadline, related
candidates, phase, acknowledgment time, deferral reason and delivery status. Important
developments may wait up to 24 hours, bounded by their source expiration, instead
of being lost after 15 minutes. Social deferral consumes no model offer. Existing
two-offer limits, source permissions and freshness checks still apply. The existing
heartbeat reconciles a known deadline crossing the next-day horizon once, without
creating a generic reminder feed or another timer.

Related records sharing configured entities and a bounded observed/planned time
window form one small decision bundle. Delivery settles related pending candidates
together. The complete admitted bundle is revalidated before delivery and contributes
its actual source dependencies. Source revocation cancels or invalidates the bundle.
Acknowledgment/dismissal suppresses unchanged callbacks; meaningful new content may
produce a new candidate.

Browser topic identity uses the normalized content hash, not descriptions refreshed
by the DOM. BehaviorCore additionally keeps 64 bounded, opaque semantic saturation
keys for two hours. It checks saturation before optional capture and request-budget
reservation. Changing screenshot pixels or rephrasing a curiosity cannot reopen the
same document subject. A changed authorized content hash or document title can.
Direct questions still work. Existing physical looks, visits and movement remain.
The old return-to-unresolved-curiosity trigger was removed; returning permits only
a changed-evidence check through this same gate, not a second speech path.

Conservative limitation: without authorized semantic evidence, a same-title native
document may remain saturated for two hours even if its pixels change. This avoids
repeated screenshot speculation; a direct request or changed title can reopen it.

## Diagnostics and verification

Diagnostics expose snapshot count/characters, pending attention, saturation and the
zero-model ingestion invariant. Behavior diagnostics also expose its saturation
count. scripts/stage4-benchmark.ts measures repeated-event CPU, memory, checkpoint
size, context size and queue deduplication. It uses synthetic data and no accounts.

Read STAGE4_VALIDATION.md for actual results and limitations, and STAGE5_HANDOFF.md
for continuation. Prior Stage 1/2/3 local work remains in place and uncommitted.
