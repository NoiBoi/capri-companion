# Capri — desktop AI companion (unofficial fan project)

Capri, the personality construct from *Cyberpunk: Edgerunners 2*, living on your Windows 11 desktop. She floats above your windows, watches the cursor, blinks, fidgets, falls asleep when you're away, **teleports around your screen** with glitch effects while her AI link is live, and talks through **Google Gemini** (or another model). She listens through push-to-talk or an optional wake word, and handles timers, reminders, notes, websites, approved apps and file search, asking first when it matters.

> **Not official.** Capri's artwork here is an original vector reconstruction drawn in code from official frames and the Netflix clip *The Moment D Meets Capri* ([reference board](docs/REFERENCE_BOARD.md), [dossier](docs/CHARACTER_DOSSIER.md)). The voice is a clearly labelled substitute. No studio assets, frames, audio or voice data are included. Cyberpunk and Edgerunners belong to CD PROJEKT, Studio Trigger and Netflix.

## Install

1. Run `release\Capri-Setup-1.0.0.exe`. It installs per-user (no admin needed) and lets you choose the folder.
2. The installer is **not code-signed**, so Windows SmartScreen will warn. Choose *More info → Run anyway*.
3. On first launch a welcome panel asks you to pick a "brain":
   - **Google Gemini** (default): paste your key in *Model → Gemini API key*. It's stored encrypted with Windows DPAPI. Default model `gemini-3.5-flash-lite`, falling back to `gemini-3.1-flash-lite`.
   - **Offline commands**: works immediately with no internet. Handles timers, reminders, notes, opening sites and apps, and file search.
   - **Ollama** (free, local): install from <https://ollama.com>, run `ollama pull llama3.2`, then pick *Ollama*.
   - **Cloud API**: an OpenAI-compatible endpoint (OpenAI, OpenRouter, LM Studio, llama.cpp…) or Anthropic. Paste the key in *Model*. Keys are encrypted with Windows DPAPI.

**Uninstall:** use *Settings → Apps → Capri*, or *Uninstall Capri.exe* in the install folder. Your data in `%APPDATA%\Capri` is kept; delete that folder too if you want everything gone, or use *Privacy → Delete all data* before uninstalling.

## Using her

| Do this | To |
|---|---|
| Drag her | move her (position is remembered per monitor) |
| Double-click her | open chat |
| Right-click her or the tray icon | menu: chat, talk, click-through, do not disturb, hide, settings, quit |
| `Ctrl+Alt+Space` | open chat |
| `Ctrl+Alt+T` | push-to-talk (press again to stop; auto-stops on silence when triggered by the wake word) |
| `Ctrl+Alt+X` | stop talking / cancel |
| `Ctrl+Alt+P` | teleport (tray: *Teleport to cursor*, other monitor in the right-click menu) |
| `Ctrl+Alt+H` | hide / show |
| `Ctrl+Alt+C` | interact for 15 s while click-through is on |
| `Esc` (in the panel) | stop the reply, or close the panel |

If another app already owns a shortcut, Capri falls back to `Ctrl+Alt+K / Y / O / J / V / Z` respectively. *Diagnostics* shows which combinations are active.

Try saying: "sit down", "sit on my window", "peek", "recline", "come here", "teleport", "move to the other monitor", "timer 10 minutes", "remind me to stretch at 3pm", "note: buy coffee", "open github.com", "launch notepad" (after approving it under *Permissions*), "find files named budget" (after authorising a folder), "remember that I like synthwave".

## What's in the box

- **Real footage art (default):** she's drawn from cut-outs of the show itself: standing, sitting, lying on her side and lounging. Each pose keeps the show's original drawings and holds. On top of that she bobs, breathes, turns to face what she's looking at, and glitches. During glitch bursts she uses the show's own glitch-out drawings. See [assets/capri/SOURCES.md](assets/capri/SOURCES.md). **This art is for private use only**; set *character.art* to `vector` for a shareable build.
- **Desktop-pet handling** (like Desktop Mate and Shimeji):
  - Pick her up and she dangles and swings from where you grabbed her.
  - Drop her on the top edge of the window you're using, or near the taskbar, and she sits there.
  - Fling her and she flies across the screen, bouncing off the edges until she skids to a stop.
  - A click pokes her; rubbing the cursor back and forth over her head pats her.
- **Teleport:** her real window jumps to a free spot. That's never under your cursor, avoids the app you're using, can be another monitor, and comes beside your cursor when you summon her with `Ctrl+Alt+Space`. The effect: chromatic split → collapse to a scanline with a shard burst → reassembly into an observed pose. She teleports on her own only while the AI connection is live (configurable interval, never mid-conversation or in DND).
- **Gemini:** the official `@google/genai` SDK (Interactions API), streaming, multi-turn, `store:false`, fallback model, rate-limit/retry handling. A live status chip (connecting / online / offline / error) appears only after a real authenticated check.
- **Postures:** she sits on the taskbar or on top of the window you're using (and jumps off if you move it), curls up or reclines in mid-air, stands contrapposto, peeks in from a screen edge and dashes across the screen. Each pose is taken from Netflix footage; see [ANIMATION_CATALOG.md](docs/ANIMATION_CATALOG.md#v3-postures-legs-hips-lean). Right-click → *Pose* to pick one, or just ask her to sit.
- **Character:** a procedural shard rig (head yaw/pitch/roll parallax, gaze, blinking, squint, lip-sync, arm IK, spring-physics hair, glitter texture, violet offset outlines, glitch FX). Rendered on a DPI-aware transparent canvas with per-pixel hit testing.
- **Animation:** a behavior state machine plus 39 keyframed clips. Six are tied to official footage or frames: the arms-spread reveal, menace squint, many-eyes bloom, looming, tilted grin and front stare. "Snap" easing reproduces Trigger's held-pose limited animation. Every play varies speed, amplitude and mirroring. The AI can trigger 23 validated expressions. See [ANIMATION_CATALOG.md](docs/ANIMATION_CATALOG.md).
- **Desktop presence:** always-on-top (toggleable), click-through with temporary interaction, never steals focus, hides during fullscreen games, video and presentations, multi-monitor and DPI aware, survives monitor unplugging, tray app, launch-at-login opt-in.
- **AI:** streaming, interruptible conversation; persona prompt that separates canon from interpretation; persistent history with retention; user-approved long-term memory; providers Ollama, OpenAI-compatible, Anthropic and Offline.
- **Voice:** Windows voices (offline) or an OpenAI-compatible TTS endpoint; offline Windows speech recognition or a Whisper-compatible endpoint; optional on-device wake word "Hey Capri".
- **Actions:** 10 validated tools behind allow / ask-first / never policies. There is no shell and no arbitrary command execution, and prompt-injection defences are built in. See [SECURITY.md](docs/SECURITY.md).

## Developing with a Gemini key

Create `.env.local` in the project folder (git-ignored, never packaged):

```
GEMINI_API_KEY=your-key-here
```

Or set the `GEMINI_API_KEY` environment variable. A key saved in the app takes precedence. `node scripts/gemini-probe.mjs` checks auth, model availability, streaming and multi-turn without printing the key.

## Build from source

Requirements: Windows 10/11 x64, Node.js 22+, npm 10+. No native compiler is needed.

```bash
npm ci
```
```bash
npm start
```
```bash
npm test
```
```bash
npm run test:e2e
```
```bash
npm run dist
```
```bash
npm run verify:package
```

`npm start` runs from source. `npm test` runs the 150 unit tests. `npm run test:e2e` runs 29 Electron end-to-end tests off-screen, so nothing appears on your desktop. Optional extras: `CAPRI_LIVE_GEMINI=1` adds the live Gemini test, `CAPRI_E2E_MIC=1` adds the live-mic test, and `CAPRI_ONSCREEN=1` lets you watch. `npm run dist` builds `release\Capri-Setup-<version>.exe`. `npm run verify:package` silently installs, runs the e2e suite against the installed exe, measures performance and uninstalls.

Other scripts: `npm run icons` re-renders the app icon from the rig, `node scripts/preview.mjs` saves pose screenshots, `node scripts/perf.mjs` measures performance, and `node scripts/licenses.mjs` regenerates the license inventory.

## Documentation

- [docs/REFERENCE_BOARD.md](docs/REFERENCE_BOARD.md): v2 reference board and character specification (Netflix clip, frame by frame)
- [docs/ANIMATION_CATALOG.md](docs/ANIMATION_CATALOG.md): observed motion → implementation
- [docs/CHARACTER_DOSSIER.md](docs/CHARACTER_DOSSIER.md): research, canon vs interpretation, asset provenance
- [reference/SOURCES.md](reference/SOURCES.md): source manifest
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): design and architecture decision records
- [docs/SECURITY.md](docs/SECURITY.md): privacy, permissions, data locations
- [docs/TESTING.md](docs/TESTING.md): test inventory, results and performance numbers
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)

## Known limitations

- **The default art is the studio's own footage**, so it's private use only. The `vector` art mode is the original reconstruction.
- **Not the official voice.** The look is a reconstruction from three frames. Profile and back views, plus most motion, are interpretation. There is no authorised voice.
- **Animations aren't taken from the show.** No animation data from the series exists publicly. The 39 clips are original work; 6 are posed after official footage or frames and the rest are interpretation.
- **Teleport effect is an inference.** In the show she appears by hard cuts. The dissolve extrapolates her observed glitch-shard and many-eyes visuals.
- **Gemini model speed varies.** `gemini-3.8-flash` was far too slow in testing (90 s), so the faster Flash-Lite models are the defaults. Gemini 3.6+ ignores the Creativity slider.
- **Untested hardware:** teleport across real multiple monitors wasn't tested (one monitor available; logic tested with simulated layouts). The Windows tray menu is native and can't use the design system.
- **Unsigned installer.** SmartScreen warns on first run. There's no auto-update; install a newer version over the old one, and settings and data carry over.
- **Windows offline speech recognition** (System.Speech) is noticeably less accurate than Whisper. Use a Whisper-compatible endpoint for better results. The wake word can false-trigger.
- **Windows-voice lip-sync** is rhythm-based, because the OS doesn't expose the audio. With a TTS endpoint it follows real amplitude.
- **Memory footprint** is about 360–500 MB across Electron's processes. That's the cost of Electron; CPU is about 1% of one core while idle.
- **Clean-machine testing** used a fresh install folder and profile on this PC (Windows Sandbox isn't available on Windows Home). It wasn't tested on a second physical machine or a multi-monitor rig. Multi-monitor logic is unit-tested with simulated displays.
- **Personality depth** is limited by how little canon exists four days after release. The persona labels which lines are canon.
