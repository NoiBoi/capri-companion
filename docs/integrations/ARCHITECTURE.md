# Life Context Stage 1

Release 0.4.0. The existing Electron main process owns this subsystem. There is no second agent, scheduler, memory migration, graph database, or model call during ingestion.

## Existing components and boundaries

- `BehaviorCore` remains the sole optional model decision lane. Host interruption, focus, sleep, hidden/fullscreen, speech, budget and delivery gates remain in force. Candidate events enter the existing presence opportunity; they do not speak directly.
- `PersonalContext` retains explicit situations, intentions and follow-ups. `RelationshipStore` retains user/project threads and Capri's established tastes. They are not replaced by the event ledger.
- `CompanionScenes` retains established shared experience and completed action receipts. Existing desktop exploration, movement, Spotify/YouTube metadata and screenshot systems remain.
- `HonchoMemory` retains its local conversation/profile implementation, erasure queue and native stores. Stage 1 source learning is intentionally unavailable. External observations and source-informed assistant dialogue never become Honcho input, auto-learned profile facts, tastes or episodes. Ordinary native conversation/profile learning works when connected live sources are absent.
- `docs/DIALOGUE_GUIDE.md` remains the cumulative personality foundation in both prompt paths.
- Typed preload channels retain main-process sender checks and Zod validation. Pairing uses the existing OS-encrypted `SecretStore`; no plaintext application token file is introduced. When OS encryption is unavailable, pairing is session-only.

## Event model and bounded persistence

`src/shared/lifeContext.ts` defines adapters, source policies, events, entities and candidates. Events include source identity, source record ID, monotonic revision, occurrence/reception/expiry timestamps, operation, type, canonical entity IDs, evidence quality, bounded detail and permissions. Observed data, user statements, model interpretations and uncertain associations have distinct labels.

`LifeContext` appends accepted events to a bounded in-memory ledger. A debounced atomic JSON snapshot avoids a new Windows native SQLite dependency. Existing unrelated stores are untouched. Limits: 21 sources including Chrome, 100 entities, 2,000 event records, 512 candidates, 4,000 revision watermarks, 1 to 30 days of source retention. Source configs survive restart; evidence/candidates/watermarks persist only for sources with retention permission and saved-history enabled. Nothing is retained indefinitely.

Equal/older revisions are rejected. Tombstones preserve deletion ordering across restart. Latest revision per record supplies current projections, excluding expired, deleted, paused, revoked or live-disabled evidence. Delayed historical events remain historical. Current explicit user corrections block passive overwrites until expiry, while deletions still take effect immediately. Changing source controls invalidates that source's previous evidence. For an unrecognized store version/schema, startup fails without replacing the original file; invalid JSON uses the established corruption backup behavior.

Canonical project IDs and user-confirmed aliases associate folder names, repository URLs and documentation. Source-backed aliases disappear on forget/revocation. Uncertain associations are displayed with their certainty and never automatically treated as an identity. There is no fuzzy model-generated merge or completion inference. Users should choose distinctive aliases; ambiguous aliases can match multiple projects and remain qualified.

`ContextAssembler` selects up to six fresh records, bounded to 3,600 characters, ranked by explicit correction, project relevance and freshness. It combines immediate context, selected native material, historical excerpts and Honcho understanding within a character budget. Chat and ambient prompts use it incrementally while preserving the native recall paths. Character budgets are conservative length limits, not tokenizer estimates. Records are serialized as untrusted evidence, never action authorization. Chat actions become tainted when live sources can have informed the exchange, retaining existing confirmation escalation for noncosmetic tools.

## Attention lifecycle

Events with sufficient importance/freshness create semantic candidates. Ordinary page navigation/headings and individual file edits stay below the unsolicited-speech threshold; approved selected content, a development-session batch or a Git change may qualify. Equivalent content updates refresh evidence, not novelty. Candidates progress through pending, deferred, delivered, dismissed, expired or superseded. A brief settling delay and at most two attempts limit retries. Delivered semantic callbacks remain consumed through retained restart history; when retention is off, consumption is session-local by design.

Existing presence arbitration selects at most one candidate. Direct chat cancels in-flight optional work through the existing BehaviorCore cancellation path. Accepted gestures or quiet decisions do not manufacture spoken history. A host-confirmed delivered callback consumes the candidate. No clock event alone manufactures a reason to talk.

## Chrome transport and semantics

The shipped MV3 extension uses optional exact site grants and its own clear allowlist. The app independently enforces exact site origins. The extension observes only the active tab in Chrome's focused window, top frame, and no incognito. Periodic freshness checks are lightweight source observation, not reasoning. Navigation, focus changes and debounced DOM mutation hints trigger recapture. The service worker stores pairing/allowlist in `chrome.storage.local`, uses a 30-second alarm to recover after suspension or Capri restart, and exponentially backs off to five minutes after connection failure.

Requests go to `127.0.0.1:43129/v1/page`. The bridge requires the exact Host, exact paired `chrome-extension://ID` Origin, bearer token and JSON content type, with bounded request size, connections and timeouts. No wildcard CORS, remote bind, unauthenticated pairing endpoint or action channel exists. Extension IDs are selected by the user in Capri, not trusted from an unsolicited network message. Authentication cannot protect against an already-compromised local process that possesses the token.

Default payloads contain sanitized URL (no query/fragment/userinfo), title, up to eight headings and a description. Selected text or a bounded article excerpt needs both app content permission and a deliberate extension action. No automatic full body, screenshot, iframe, input, form, editable field or hidden content is captured. Sensitive URL categories and pages containing password/payment fields are blocked. Secret-pattern redaction is best effort, not a guarantee that arbitrary prose lacks private information. Only allow sites whose headings/metadata may be shared with the configured dialogue model. Page text is not proof the user read or understood it. Lost focus or revoked site permission emits a tombstone; if delivery fails, evidence expires after 90 seconds.

## Project adapter

Only explicitly picked folders are authorized. A maximum of 20 project watchers use a 900ms debounce and asynchronous bounded scans (3,000 files, 500 directories, depth 12, file metadata up to 2MB). Dependencies, builds, release outputs, Git internals, common credential names and generated binaries are excluded. Symbolic links are not traversed. Rename detection uses file identity when available; otherwise a rename is a create/delete pair. Large folders must be narrowed to avoid scan-limit ambiguity.

Git branch/HEAD are queried without a shell, optional locks or prompting, with a short timeout. Worktree Git metadata pointers are supported. Git internals are never ingested. Changes create metadata evidence and batched session observations, never proof of task completion or successful builds. Unavailable watchers show a failure and retry with capped exponential backoff. No editor plugin or entire-filesystem monitor is installed. Browser/project associations use explicit IDs; editor title guesses are not promoted to verified project activity.

Content indexing is optional, bounded and incremental: only changed approved text/source files up to 16KB, a 2KB read and at most 1,000 characters of sanitized excerpt per event. Read paths are resolved and checked for containment; obvious secrets and ignored paths are excluded. No embedding service, full repository index, automatic document upload or PDF reader exists in Stage 1.

## Revocation and learning boundary

Collection, live dialogue, retained ledger history and content access are independently controlled. Honcho learning from Life Context is explicitly disabled rather than exposing a switch that cannot support reliable provenance erasure.

While any connected live source is enabled, automatic model learning from the exchange is suspended. Source-informed assistant messages carry `contextSources`, stay visible in saved Chat, and are excluded from automatic history recall and Honcho export. They do not enter the durable shared-scene archive. Revocation cancels pending decisions and chat generation, clears immediate exchange/BehaviorCore caches, removes the source ledger/candidates and source-backed aliases, and stops the adapter. Existing approved memories, credentials for other services, Chat transcript and unrelated episodes are preserved. Users can still deliberately view saved Chat; forgetting context is not deletion of the saved transcript. This conservative Stage 1 boundary prevents derived Honcho conclusions from resurfacing without deleting pre-existing unrelated Honcho understanding.

## Future adapter contract

Calendar, music history, OwnTracks, mail/Teams, Gradescope and Discord use the same typed adapter and event contract, independent credentials and explicit per-source policies. Define stable source record IDs and revisions; map cancellations/deletions to tombstones, changes to source-backed corrections, delayed webhooks to historical events, and disconnect to immediate invalidation. Narrow OAuth scopes, supported APIs, provider-specific consent and removal semantics are prerequisites. Calendar reminders and location inference must be independently authorized. Integrations never authorize computer actions. Do not scrape authenticated private sources or add a second agent loop. Future Honcho learning needs provenance-aware derived-record erasure and tests before enabling `learn` beyond literal false.
