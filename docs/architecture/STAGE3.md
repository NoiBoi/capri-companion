# Stage 3: persistent dialogue and evolving identity

Product 0.8.0 continues the existing Stage 1/2 changes in place. The application
conversation record remains authoritative. Native model history is a replaceable
inference cache, never memory approval, a verified action receipt, or permission.

## Ownership

- `core/modelSessions.ts`: provider-neutral lifecycle, scopes, model selection,
  streaming, cancellation and token/latency accounting. Legacy providers keep
  `core/contracts.ts` and the existing `LegacyModelSessions` compatibility adapter.
- `main/ai/codexSessions.ts`: isolated stdio JSON-RPC App Server, installed-schema
  discovery, initialize, native start/resume/fork, streaming, interruption,
  compaction completion, usage, and deletion. It never connects to the shared
  desktop daemon or modifies Codex configuration or authentication.
- `main/cognitive/conversationSessions.ts`: bounded routing, structured handoffs,
  current-context replacement blocks, retention, deletion debt and recovery.
- `main/cognitive/dialogue.ts`: small application-owned conversational state.
  Delivered positions/reasons and prior positions cite actual assistant messages.
  Explicit user corrections, transitions, resolution and saturation change the
  direction. Questions close on replies, topic abandonment or age. No second LLM
  pass is required. Extraction is deliberately conservative rather than claiming
  complete semantic understanding.
- `RelationshipStore`: the existing exclusive owner of learned tastes. At most
  four previous evidence-backed taste changes are retained in the same record.
  Its self-model projection labels user configuration versus expressed tastes.
  Foundational character instructions remain separate. PersonalContext, episodes,
  approved user memories and Honcho retain their existing ownership.

## Routing and context

The primary conversation is the default. An explicit return to a known project
can select a project key. Short replies and complaints about Capri's behavior
stay in the current conversation. Browser observations and background decisions
still use bounded ephemeral CLI work. A source-backed direct turn gets its own
ephemeral native thread. Off-record turns and all turns with retention disabled
are also ephemeral. No classifier is invoked for ordinary dialogue.

The active cap defaults to four and is constructor-configurable (clamped 1..8).
Model or stable-character instruction changes rotate. A thread rotates after 160 turns or its configured history
retention lifetime; the next thread receives at most eight application-owned
historical messages plus current cognition/context. The application still assembles
context for the compatibility route, but native turns receive stable character
instructions once and only changed named context blocks, with explicit withdrawal
of missing blocks. Native turns never append the reconstructed past transcript.
An initial/resumed-after-loss handoff uses only bounded application records.

Native usage records last input, cached input, output, actual last input context
size and latency. Cumulative billed tokens are not context size. Compaction starts
only between turns above 80,000 context tokens, with a four-turn minimum interval.
The client waits for its completion event. Failure or unsupported compaction
rotates with a bounded structured handoff. No mandatory rewrite pass was added.

## Security and privacy

The private server uses an empty working directory, disabled shell, execution,
plugins, apps, hooks, skills, browser, computer-use, web search, memory and agent
features, empty MCP/plugin/hook configuration, and empty environment/capability
roots. Base and developer instructions replace coding-agent directions. Unknown
server-side tool or approval requests are rejected. Native tool lifecycle events
fail closed. A local synthetic HTTP inventory of the actual installed harness
captured an empty tool list, including no dynamic capabilities. All desktop actions
remain data routed through Capri's existing validated executor.

Protocol discovery uses `codex app-server generate-json-schema --experimental`
from the installed executable. Required methods and safe context/ephemeral fields
are checked before inference. Version verified here: 0.165.0-alpha.1.2.
See [official App Server protocol](https://learn.chatgpt.com/docs/app-server).
Ephemeral paginated forks use the installed protocol requirement `excludeTurns:true` in the response; their native history and stable instructions are inherited. No user credentials are read, copied or requested. Existing Codex sign-in is used.
The existing CLI provider remains the same-account fallback only when the native
runtime cannot initialize safely, before inference. No automatic cross-provider
fallback exists, especially for source-derived/private context.

Off-record/source threads use native `ephemeral:true`; ending them destroys the
private server process. Restart cannot resume them. This is invalidation of an
in-memory session, not a claim that archived provider data was deleted. Ordinary
thread deletion uses the discovered `thread/delete` method. Actual deletion was
verified by failure to resume the deleted ID after process restart. Revoked IDs
are removed from routing immediately; failed deletion stays in a durable queue
and is retried in bounded batches. If deletion is unsupported it stays unconfirmed.
Other account/provider storage, service retention and operator backups are not
claimed erased. Existing privacy controls reset the native cache as well as their
application owners; approved memories and encrypted credentials are preserved.

An in-flight marker is persisted before inference and cleared only after the
assistant record is appended to application history. On crash, uncommitted native
history is invalidated, rather than admitting unseen statements as Capri's past.
Missing native sessions recover from the application record. Corrupt application
checkpoints fail visibly and preserve data. Closed runtime callbacks cannot write
to a closed database. Temporary protocol/working folders are removed on shutdown.

## Character performance

`docs/DIALOGUE_GUIDE.md` remains cumulative and is imported into direct and ambient
paths. Stable character instructions now have one named builder. Operational state
is quoted evidence rather than a taxonomy of emotions. A changed reason can change
an opinion without changing the character's foundations. Exhausted topics close;
a pat need not reset the exchange or always bring its old subject back. Wit,
defiance and sincerity remain available without automatic praise or lore.
Spoken dialogue still forbids em dashes. No new external biography is learned.

## Verification

See `STAGE3_VALIDATION.md` for exact results and retained failed attempts.
The live 22-turn model sequence uses fictional Glass Finch data, not personal
history. Native restart, compaction, deletion, ephemeral privacy and cancellation
were tested against the installed real account-backed runtime. Quota/timeout tests
use a local synthetic Responses endpoint rather than deliberately exhausting the
user's allowance. Several-days return is simulated in deterministic project
routing/state fixtures; no claim of waiting actual days is made.
