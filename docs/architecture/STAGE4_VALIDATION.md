# Stage 4 validation: Capri 0.9.0

Validated on October 29, 2026. The user-supplied Stage 4 specification controls
scope. External accounts remained disconnected in synthetic fixtures; no manual
authentication was required. Existing production credentials were preserved.

## Source and package checks

- Final TypeScript check passed.
- Full unit suite passed: **675 tests in 65 files**.
- Development Electron selection passed: **12 tests in 5 files**, before the
  final context-routing refinement. The final packaged selection covers that change.
- Production bundle and Windows NSIS installer built successfully.
- Final packaged selection: **23 passed, 2 skipped in 8 files**. An earlier
  packaged movement/touch selection passed **6 tests**, with 17 unrelated cases
  excluded by its name filter. Those are selected checks, not a full-suite claim.
- Real isolated Chrome DOM extraction passed **3 tests**: rendered sections,
  hierarchy, lists/tables/code, hidden descendants, forms, credentials, unsafe
  selection, poor semantic structure and YouTube playback state transitions.
- Real isolated MV3 transport passed **1 test**, including exact paired bridge
  transport, metadata, newly enabled passive semantic reading, sanitized content,
  receiver restart/reconnection and sensitive-page invalidation.

The preexisting Chromium 1228 executable could not spawn in this environment.
Installed branded Chrome ran DOM tests but did not load the test extension through
command-line flags. A fresh task-local Chrome for Testing 156 / Chromium 1248 ran
the complete MV3 fixture successfully. It did not use or change a personal Chrome
profile. The fixture now omits Playwright's extension-disabling default and polls
through real bridge backoff rather than replacing its alarm once and assuming an
immediate retry. Initial failed attempts are not counted as passed tests. A subsequent final
context-routing fixture caught URL-host words being ranked as document relevance;
the query tokenizer now excludes URLs/common metadata words. The fixture then
checks a real bounded paragraph in the actual optional model request. A long-metadata
fixture also ensures event JSON remains valid and preserves its snapshot hash.

## Scenario coverage and evidence limits

| Scenario | Verification |
| --- | --- |
| Homework near deadline, unknown submission | Typed world fixtures and next-day horizon reconciliation preserve unknown outcome. |
| Viewing versus confirmed submission | Displayed-page and email-notice fixtures stay unknown. A canonical platform-record fixture is authoritative only as a contract test. |
| User already submitted | Real manual-import adapter remains user-reported; named direct message reports resolve pending callbacks; negative correction replaces the report. |
| CAD in a research folder | Explicit folder/entity association; filenames establish activity, never model geometry or success. Existing project-watcher Electron fixture exercises actual file changes. |
| Repeated versus meaningful change | Revision ordering, content hash, one candidate for 2,500 repeated observations, browser refresh saturation and changed-content reopening. |
| Geofence and return to PC | Existing OwnTracks/Stage 2 integration fixtures validate bounded arrival/departure/PC corroboration and delayed reports; projections preserve phone-only evidence. |
| YouTube playing, pause, idle tab | Real video-element DOM fixture and receiver state schema; metadata-only tabs collect no playback; durations are samples, never viewing totals. |
| Game and Discord activity | Real local adapter fixtures distinguish process/foreground from gameplay or calls; authorized guild membership drives the existing availability actor in Electron. |
| Important email during unavailability | Real Gmail adapter response fixture creates a request; social deferral costs no offer; queue survives a two-hour simulated game/restart. |
| Meeting tomorrow | Real Calendar response fixture, one next-day horizon crossing, source expiration and bounded shared-entity coalescing. |
| Source revocation during deferral | Unit and real SQLite/Electron restart fixtures remove queue, source snapshots, retrieval and session dependencies. Native user reports remain native evidence. |
| Network failure/delayed events | Real adapter failure retains checkpoint; delayed observations keep original timestamps and do not create fresh proactive developments; Stage 2/3 backoff fixtures remain green. |

No actual multi-day wait, live private inbox, live geofence journey, live Discord
audio, direct Gradescope API or live CAD geometry inspection is claimed. The model
can still phrase an interpretation poorly; these tests verify evidence and control
boundaries, not an open-ended personality-quality benchmark.

## Cost and bounds

The final synthetic benchmark ingested **2,500 identical observations**, then
inserted 30 approved document snapshots to exercise the 24-document bound:

- 297 ms wall time / 313 ms process CPU time on this run.
- 4.8 MB measured heap growth; this is a transient allocation measurement, not a
  long-duration leak test.
- 24 snapshots / 959,616 stored content characters; checkpoint 2,200,420 bytes.
- One attention candidate; context 3,877 characters; zero ingestion model calls.

Timing varies with other work and garbage collection. An earlier run took 226 ms
wall / 219 ms CPU with 10.7 MB heap growth. The deterministic limits, not these
machine-specific timings, are the regression contract. Section retrieval, queue,
event history and topic saturation are all bounded independently.

The first staged packaged performance sample measured startup to character at
558 ms, 0.6% of one core / 452 MB total working set across four Electron processes
while idle, 1.0% / 487 MB while forced speaking, and 0.1% / 435 MB while hidden.
This is a fresh isolated offscreen profile, not the user's live desktop workload.
No performance improvement over an identically measured Stage 3 baseline is claimed.
The request lanes and provider cooldowns were retained. No background model was
invoked by the new detection, extraction, normalization, projection or deferral code.

## Release and remaining limitations

The established profile is **Documents/Capri Buddy**, as selected by current source.
It is not the historical AppData-only path in older release notes. A normal quit
and complete stopped-profile backup preceded replacement. The previous 0.8.0
portable application remains as rollback. Immediately after replacement, memory,
encrypted credentials, history, settings, Honcho state and SQLite were unchanged.
Staged/deployed ASAR equality is checked for the final replacement.

Production verification opens the real Memory panel, checks 40 active memories,
known-name availability, no settings repairs, persistent credentials and no test
hook. A full quit followed by the original Desktop shortcut confirmed 0.9.0,
the actual Documents profile, 40 approved memories, known-name availability,
Codex connected and character readiness. The final replacement repeated and passed these checks; the normal shortcut
reported character readiness in 1,028 ms. The final staged and installed ASAR hashes
matched, and every tracked profile file was byte-identical immediately after copying.

The historical Escape restoration to the previous native window remains a recorded
Stage 2 limitation. The full historical Electron suite is not claimed green. No
installer uninstall cycle or live Honcho erasure was performed. The existing source
work remains local and uncommitted, including all preserved Stage 1/2/3 changes.
