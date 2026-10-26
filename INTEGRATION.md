# Capri Buddy: private artwork integration

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
