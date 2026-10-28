> **Provenance correction:** A subsequent changelog audit found that this build was made from the original 0.2.45 checkout plus Stage 3. The separate Stage 1 unified core and Stage 2 episodic-memory implementation were not merged into 0.2.47. The earlier statement that this integrated Stages 0–3 was incorrect. Memory/history fingerprint checks do not establish compatibility with Stage 2's version-2 scene format. See the full overhaul changelog for both lineages.
# Stage 4 integration and validation (historical 0.2.47)

The actual combined implementation is documented in [Overhaul reconciliation](OVERHAUL_RECONCILIATION.md).

Version 0.2.47. This pass integrated the original 0.2.45 checkout plus Stage 3. It
adds no dependency, UI mode, emotional simulator, or persistence schema migration.

Deployed and restarted successfully. The live application package matches the
tested staging package. All 15 saved-data files checked were unchanged during
replacement; memory and history also matched their prior fingerprints after
restart. A verified full 0.2.46 application copy and its installer remain available.

## Final behavior pipeline

Foreground metadata and occasional exposed-window crops supply observations.
`EnvironmentalCuriosity` keeps bounded, dated facts, hypotheses and unresolved
interests. The existing main-process gates decide whether the moment permits a
glance, inspection, movement, speech, or silence. `ActivityDirector` supplies
small local gestures; `ExplorationDirector` owns autonomous outings and their
rest periods. `VisitSequence` now supplies only an interruption token, rather
than a second study/settle/comment schedule.

The existing renderer, artwork, expressions and movement implement those
decisions. An outing can turn toward its subject and start moving while its one
inspection is pending. Ordinary fidgets yield during tours. A real pat captures
the current interest before resetting gaze toward the user, so the subject is
not lost when a contextual response is appropriate.
An actual pat yields optional movement and retains the interest. An outing still
unwinding after cancellation cannot be replaced by a second concurrent outing.

`presentRemark` handles local arrivals and generated remarks through one delivery
path. An enabled text presentation can establish shared experience. If no text
is presented, an audio-only remark establishes experience only after a matching
start and successful completion. Muting, cancellation and TTS errors do not count
as completed speech. Completed text replies remain in conversation history even
if their audio is interrupted; that is a record of supplied text, not proof the
whole answer was spoken or read. The app does not measure whether the person
actually read a visible bubble.

The existing conversation scene, history, relationship store and approved memory
then provide continuity. Personal-memory extraction still requires user-message
evidence. Physical gestures, observations and Capri opinions do not become facts
about the user merely because they occurred on screen.

## Consolidated and retained

Removed the post-tour study/settle/comment cycle, the old renderer-triggered
return-generation route, timed lounge commentary, the unused idle-line pool and
an unused alternative character brief. Movement alone no longer requests another
generated continuation of a conversation. Authored small reactions, optional
ambient behavior and quiet body animation remain.

Retained Windows integration, every artwork asset, existing providers and model
selection, optional chat, voice options, desktop permissions, exposed-region
safety, interruption revisions, rate limits, personal memory and relationship
data. Automatic exploration honors disabled ambient/context behavior without
requesting an inspection just to narrate the trip.

## Responsiveness, calls and persistence

- Physical reactions remain local. The integrated real-renderer session measured
  4.5 ms from the pat invocation to its physical cue while generation continued.
- Inspection and initial movement overlap; delayed provider output no longer
  holds the initial glance and approach hostage.
- Audio receipts carry utterance identity. A late end/start from a stopped reply
  cannot finish or resurrect the speaking state of a newer reply. Provider
  failures cancel leftover speech. Remote audio nodes disconnect at completion.
- Error cut-ins now clear when a newer phase supersedes the error. Visual review
  caught an error flash remaining over the recovered character; its clearing
  behavior now has a focused regression test.
- Visibility analysis is reused within an existing desktop snapshot. Repeated
  target queries no longer recompute exposure for every window on every lookup.
  Foreground metadata is sampled once per presence tick. Ordinary chat no longer
  enumerates background windows unnecessarily.
- Chat turns already supplied verbatim are omitted from the scene's repeated
  turn list. Ambient history similarly omits turns already in the shared scene.
  Interpretation and delivery-pattern context remain available.
- Valid unchanged history is no longer rewritten at launch. Torn tails and
  retention changes still trigger repair. Repeated pat strokes coalesce within
  the scene, without delaying physical feedback. Disabled aggregate tracking no
  longer repeatedly tries to remove its file on each presence tick.
- Disabling history saving removes its files but retains the current unsaved
  exchange. Unrelated settings changes no longer repeatedly erase that exchange.
  Approved personal memory remains separately controlled.
- Background learning yields to ambient generation and direct conversation,
  across providers. Existing persisted budgets and cooldowns remain ceilings,
  not targets. No additional perception timer or continuous evaluation was added.

A synthetic 10,000-message local recall scan took approximately 41 ms, which did
not justify a new retrieval framework. In the three genuine test-profile requests,
the existing configured Codex model returned one visual interpretation and two
direct replies. Logged provider durations were about 6.03, 3.74 and 3.65 seconds;
output totaled 206 tokens. These are limited observations, not latency guarantees
or a dollar-cost estimate. The zero-volume Windows speech sample did not confirm
an audio start before the reply completed, so no measured time-to-first-audio
claim is made. No paid TTS test was needed.

## Demonstrated session

`scripts/verify-integrated-session.mjs` uses a real Electron renderer and an
isolated profile, synthetic visible diagram content and exactly three genuine
application requests. Its run demonstrated launch, selective inspection,
opinion, user response, a pat during generation, a real minute of quiet,
curiosity-guided movement, restart, shared-subject recall, simulated provider
failure/recovery, and focus/privacy changes.

Capri noticed the green route leaving an enclosure and offered a tentative
interpretation rather than claiming to know its purpose. Her retained curiosity
was about the rule making the outside endpoint interesting. The subsequent
outing favored that same subject and completed without another model request.
No new chat messages appeared during the quiet minute. A test memory, the actual
exchange and its subject survived restart. The final genuine answer considered
whether the branch should escape and correctly computed 17 times 24 as 408.

The provider-outage fixture recovered without a stuck busy state. Turning off
history removed history and scene files, while a new session-only turn survived
an unrelated volume change. Focus blocked the available inspection opportunity.

## Validation and limits

The first full pre-Stage-4 desktop run had 134 passes, ten failures and two
conditional skips. Several assertions still required superseded behavior:
eight-second observation dwell, compulsory return/arrival lines, reciting window
titles, or a second post-tour commentary cycle. The memory-learning test ignored
the real background cooldown and selected the wrong item in the redesigned
memory panel. Those checks now exercise the actual timing, delivery, privacy and
continuity contracts. They were not fixed by reintroducing unwanted chatter.

Final validation:

- Type checking passed. All 435 unit tests across 48 files passed.
- A full packaged desktop sweep ran 147 cases: 141 passed, four failed, and two
  conditional native cases were skipped. Three failures still referenced removed
  visit phases/fields; the fourth was an overlay launch blocked by the host's
  fullscreen state leaking into an offscreen fixture.
- The obsolete checks were updated to assert the real active/finished tour
  lifecycle. Offscreen test profiles now isolate host fullscreen activity; the
  production fullscreen protection remains unchanged. Target-loss cancellation
  and the single-outing guard were checked directly.
- All 11 final focused packaged checks passed, covering all four failing paths,
  both new cancellation boundaries, quiet visual context, stale-target rejection,
  completed versus cancelled audio delivery, and actual renderer scenes. A second
  full desktop sweep was not repeated after these corrections; no single fresh
  all-green full-suite run is claimed.
- The installer was built. Validation ran against the packaged executable with
  isolated profiles, rather than installing/uninstalling over the user's setup.
  The older installer verifier's hard-coded executable name was corrected to
  follow the package product name, and its syntax was checked.
- Packaged visual recovery was inspected after error and idle transitions. The
  error overlay was absent, with error impact zero and no active cut-in.

On the Intel i9-14900HX host, the final controlled offscreen sample measured
666 ms to character startup, 30 idle frames per second, 0.8% of one CPU core
and 500 MB summed working set across four Electron processes. Forced speaking
animation measured 1.2% and 470 MB; hidden/paused rendering measured 0.1% and
433 MB. The prior build's sample was 757 ms, about 30 frames per second,
0.6%/632 MB idle and 0.1%/587 MB hidden. These are individual samples with
different cache/system conditions, not proof that this change caused a CPU or
memory reduction. The confirmed optimizations remove redundant work and writes.

The environmental table remains session-only, with 32 subjects, a two-hour
absence horizon and 15-minute visual evidence freshness. Restart continuity uses
actual saved conversation and approved memory; it does not pretend Capri saw or
thought about unseen activity while closed. Titles can change, and content can
change without its title changing. Selective crops cannot supply complete intent.

Three provider turns and short controlled sessions cannot establish subjective
naturalness, consistent show-level acting, multi-hour leak freedom, or reliable
real-world speech latency. The existing Electron/artwork footprint remains
substantial. The measured quiet session's main-process resident memory increased
from 146 to 400 MB during initialization and speech use; that sample is too short
to label either a leak or a stable long-session plateau. Final packaged idle
measurements are reported separately, with scope and units.

Rollback uses the retained 0.2.46 installer and a copy of the prior local
executable/application package made before deployment. No user data is restored
or reset as part of switching application versions.

Rollback files:

- Full prior application: `C:\Users\matth\Documents\Codex\2026-10-25\i-x20\outputs\Capri\release\rollback\0.2.46\win-unpacked`
- Prior installer: `C:\Users\matth\Documents\Codex\2026-10-25\i-x20\outputs\Capri\release\Capri-Setup-0.2.46.exe`

To restore the portable build, quit Capri, copy the prior application's contents
over `release\win-unpacked` in the same project, and start Capri again. Leave the
AppData folder alone so current settings, memory and history remain in place.
