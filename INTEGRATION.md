# Capri Buddy: private artwork integration

## 0.2.10 reply priority and background learning

The foreground reply no longer awaits memory extraction. A bounded in-memory
queue starts after the reply completes and a short quiet delay. A new user
message cancels pending extraction and defers the unfinished job until chat is
idle again; one learning request runs at a time. Old/new user facts are processed
in order, so corrections still replace their prior entries. Current corrections
are understood from conversation immediately, before long-term storage catches
up. Manual edits/deletion/Undo, disabled memory and shutdown discard pending
jobs so they cannot resurrect intentionally removed entries. Completed memories
remain persistent; unfinished jobs are session-local. Failed learning remains
independent of reply success. The UI and prompt no longer claim extraction has
already finished. Successful chat replies now restore connection status.

## 0.2.9 automatic conversational learning

Opt-in automatic learning runs a bounded structured extraction before the main
reply, using the configured model and only the current user's message as new
evidence. Explicit durable facts/preferences are saved; corrections update the
matching entry rather than append contradictory versions. Uncertain or quoted
claims and temporary moods are excluded by the extraction contract. Each change
requires an exact supporting quote, validated schema and an unchanged store
snapshot. Manual edits, deletion, disabled memory and cancellation take priority.
Failures leave memory unchanged and do not prevent the main reply.

Automatic changes retain up to eight reversible revisions per entry with source
message ID and evidence, visible in Memory. Forget requests exclude entries
from future memory context while retaining a reversible local record until the
user permanently deletes it. Undo never rewrites a later manual correction.
An extra model request can add latency and usage. No background polling or
retroactive mining of saved conversations is added. Existing model-suggested
remember actions remain governed by their original policy when learning is off.
The Memory panel ignores superseded asynchronous refreshes after mutations.

## 0.2.8 attributed persistent profile

User-supplied profile entries can be imported atomically with source label,
supply date and fact/preference/interpretation classification. Reimporting the
same entries does not duplicate them or discard existing memories. The Memory
panel shows provenance and supports inline correction while retaining the source
and recording the correction time. Approved context is omitted when memory is
off; pending entries never enter the prompt. The prompt distinguishes tentative
interpretations and dated reports from enduring facts, prioritizes current
corrections, and leaves unknown personal facts unknown. Private import data is
kept outside the source checkout and persists in the user's local memory store.

## 0.2.7 character performance

The dialogue brief now gives Capri conversational motives, tastes, vanity,
curiosity, disagreements and quiet sincerity. Original tone examples teach
contrast instead of relying on franchise slang. Contextual and offline banter
uses the same brief, and ambient lines avoid immediate repetition. Expressions
return after a short clip while deliberate pose choices retain their duration.
Biography beyond existing source notes remains excluded; added characterization
is explicitly interpretation. The separate user profile import is deferred.

## 0.2.6 connected personality

One local personality clock connects cursor attention, touch reactions and idle
sequences. Cursor approach has a short dwell before notice/watch/play/settle;
repeated pokes build mild annoyance, pats build contentment, and emotions fade
naturally. Explicit animation selections, hanging, dragging, sleeping and
teleport sequences retain priority. The Character panel has an Expressive
behavior switch. Original PNGs are unchanged.

The renderer shares mood with conversation context and captures it per spoken
utterance. Remote TTS appends mood delivery to the editable voice prompt while
preserving Nova and speed. Fetch/playback is serialized, and stopped requests
cannot begin playing after their response arrives. Contextual bubbles greet a
return from at least three minutes away or react to window movement. They obey
Idle remarks and quiet settings, have cooldowns, and do not replace an open
composer or active conversation. Touch responses remain silent. Recent session
interactions provide small callbacks; approved memory and saved position remain
the existing persistent sources. No new screen monitoring or model polling is
introduced.

## 0.2.5 Nova voice delivery

Remote speech sends editable delivery instructions and the Rate slider to the
speech endpoint. The preset uses gpt-4o-mini-tts with nova and playful, lightly
raspy, conversational delivery. Pitch is shown only for Windows voices because
the remote endpoint has no pitch parameter. Older tts-1 models omit instructions
for compatibility. Existing provider, microphone, volume and credentials remain
as configured; the live voice preset uses rate 1.05.

## 0.2.4 window movement and hanging

An attached window changing position or size puts Capri in idle/blink at her
old position. She waits until the left mouse button is released and geometry
has settled for 240 ms, then plays the original perch_glitch strip through both
teleport phases. The destination is resolved after departure to catch Windows
snap/maximize adjustments, preserving her relative place along the window.
High windows use the original dangle strip below the top edge. Available
headroom is calculated for the window's monitor and character scale, with a
small hysteresis band to avoid pose flicker. Moving the window down restores
perching. Closing or minimizing the target releases the attachment.

## 0.2.3 stable bubble sizing

Bubble movement now writes a fixed requested width and a cached content height.
It never reuses Windows' rounded native size for the next position update.
Duplicate layout measurements and two-pixel rounding jitter are ignored, and the
card has a fixed CSS width so viewport rounding cannot repeatedly rewrap it.
The chat shortcut also explicitly focuses the input on every opening.
A regression check exercises 2,000 repeated placements at 125% display scaling
and verifies that the bubble dimensions remain unchanged while idle.

## 0.2.2 bubbles and character presence

- Double-click, the chat shortcut, the tray, and the launcher open a compact
  attached speech bubble with an input, rather than the full settings/chat panel.
  Normal model replies appear there even when voice and the large panel are off.
- The bubble follows Capri, wraps and scrolls long replies, shows thinking/stop
  controls, and can be dismissed with Escape. It can send chat but cannot access
  API keys, edit settings, or approve computer actions; those remain in the panel.
- Seated artwork looks right in the original strip, while standing artwork looks
  left. Facing now uses the active clip's source direction, including blink/glitch
  variants. Facing > Original artwork keeps every strip unmirrored.
- Blinks play the complete four-frame sequence instead of being cut off by the
  faster procedural eyelid timer. Standing and sitting selections retain blinks.
- Added small idle fidgets, a seated lean around the contact line, visual talking
  for muted text replies, and rate-limited local poke/head-pat bubble responses.
- Conversation instructions favor concise, playful responses over generic helper
  introductions. This is interpretation, not a claim of exact character fidelity.
- `node scripts/verify-bubble-live.mjs` checks a real Codex reply through the bubble
  in an isolated profile, without opening the large panel.

## 0.2.1 interaction fixes

- Window seats track a native window handle, not whichever app currently has focus.
  A chosen seat stays pinned against automatic teleporting and follows the window
  during movement/resizing. Closing or minimizing it releases the seat in place.
- Drop snapping searches visible windows below the character, including background
  windows, and uses the same contact line as the sprite renderer.
- Corrected the source artwork's facing direction. Cursor tracking works beyond
  the transparent window and expires when the cursor stops moving.
- Hit testing uses the opaque base sprite rather than particles, glow or teleport
  pixels, and updates as the animation changes underneath a stationary cursor.
- The animation intensity control changes sprite playback and movement; zero
  freezes playback. A persistent Animation selector exposes the actual supplied
  strips instead of unsupported vector-only poses.
- Teleport effects resume a covered/paused renderer; departure/arrival completion
  listeners are registered before sending the effect cue.
- Validation: 196 unit checks, 40 desktop checks (two optional checks skipped),
  plus an explicit native-window snap/focus-change/move/resize check. Rendering
  and contact alignment were checked again after aligning the snap line.

This local branch combines TheAgencyMGE's companion with the original
lachydotmcg PNG strips. No remote fork or public upload was created.

Sources:

- Companion: https://github.com/TheAgencyMGE/capri-companion
  at c094ec1e74941c075cf0a2ce5ab340a58a3c6344.
- Artwork: https://github.com/lachydotmcg/capri-desktop
  at b3d7144f9954ba294b623d7e780d1b510b92a2eb.
- Artwork attribution: `assets/capri/lachy/SOURCES.md`.

## What changed

- The character draws the original 13 PNG strips directly instead of the vector
  body. Idle, blink, grin, glitch, drag, sleep, wake and perch states follow the
  companion's behavior. The supplied mouth overlay follows speech amplitude.
- The original desktop shell, pixel hit testing, drag/drop, taskbar/window
  placement, teleport effects, settings, conversation, voice and action tools
  remain connected. Gaze currently changes her facing and adds a small lean;
  the original baked-in eyes are not independently redrawn.
- Added a Codex account provider using the installed CLI's own sign-in. It does
  not read, export, or copy account credentials. Replies and screenshot decisions
  consume the user's Codex usage. Other existing providers are still selectable.
- Codex subprocesses use empty temporary working folders, ignore user config,
  disable the shell tool and do not persist Codex sessions. The companion passes
  its conversation context each turn. Desktop actions stay inside Capri's
  validated action/approval system. Replies appear after each completed model
  response, rather than token-by-token.
- Computer control can use Codex screenshot decisions as well as Gemini. Both
  the chat Stop button and Esc cancel an active task.
- Startup waits for the character renderer's loaded artwork/first frame, fixing
  an offscreen first-launch timing race.
- Packaged separately as Capri Buddy to avoid sharing another installation's
  settings. On first launch it selects Codex when the CLI is installed. Speech
  starts muted; select a Windows substitute voice in Voice to enable it.
  Initial scale is 65%, and fullscreen hiding starts off so she remains visible
  beside the current workspace. Both can be changed in Character settings.

## Run and build

`npm ci`, then `npm start` for development. `npm run build` compiles the app;
`npx electron-builder --win --dir` creates `release/win-unpacked/Capri Buddy.exe`.
Keep that executable with its surrounding files.

`npm test` runs unit checks. `npm run test:e2e` tests isolated offscreen windows
with mock model endpoints. `node scripts/verify-live.mjs` explicitly makes two
real requests through the signed-in Codex CLI: conversation and an image-based
action response, without physically operating other apps.

Computer control uses the primary display and the real Windows cursor. Its
action restrictions are partly prompt-based, as in upstream; this is a working
prototype rather than an audited autonomous desktop agent. Autonomous browsing
stays off and still requires Gemini in the inherited explore mode. No voice
cloning or original Capri voice is included.
