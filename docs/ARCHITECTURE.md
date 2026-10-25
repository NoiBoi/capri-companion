# Architecture

## Overview

```
┌──────────────────────── Electron main process (trusted) ───────────────────────┐
│ app.ts ─ lifecycle, single-instance, crash/clean-shutdown marker, shortcuts    │
│ windows/  character window (transparent, non-focusable) · panel window          │
│ desktop/  displays (multi-monitor/DPI clamp) · fullscreen watcher (koffi→user32)│
│ store/    settings (zod, migrations) · secrets (safeStorage/DPAPI) · history    │
│           memory (approval queue) · notes · reminders · JSON-file atomic writes  │
│ ai/       providers (Ollama, OpenAI-compatible, Anthropic, Offline) · persona   │
│           conversation orchestrator (streaming, abort, retry, action parsing)   │
│ actions/  registry · zod arg schemas · policy (allow/confirm/deny) · executors  │
│ voice/    offline STT (System.Speech child process) · cloud STT · wake word     │
│ log.ts    JSON-lines logger, redaction, rotation                                 │
└──────────────── IPC (contextBridge, typed channel allow-list) ──────────────────┘
      │                                              │
┌─────┴──────── character renderer ──────┐  ┌────────┴─────── panel renderer ───────┐
│ rig/ vector shard rig (Canvas 2D)      │  │ chat, history, voice, settings,      │
│ animation/ param blending, springs     │  │ memory, permissions, diagnostics     │
│ behavior/ state machine (idle…sleep)   │  │ action confirmation dialogs          │
│ speech/ TTS + lip-sync, mic capture    │  └──────────────────────────────────────┘
│ hit-test → click-through forwarding    │
└────────────────────────────────────────┘
```

## Architecture decision records

### ADR-1: Electron + TypeScript, bundled with esbuild
**Context.** We need per-pixel transparent, always-on-top, frameless windows with hover-forwarded click-through; an OS credential store; mic access; TTS; a Windows installer.
**Decision.** Electron. It provides `setIgnoreMouseEvents(…, {forward:true})`, `safeStorage` (DPAPI on Windows), Chromium `speechSynthesis` (Windows voices), `getUserMedia`, and mature NSIS packaging via electron-builder.
**Alternatives.** Tauri (Rust was available) has a smaller footprint, but WebView2 transparency with click-through forwarding needs custom Win32 work, and there's no built-in TTS or secret store. Native WinUI/WPF would need a separate renderer for the vector rig and a rebuilt UI.
**Cost.** About 100 MB installed and roughly 150 MB RAM baseline. To compensate, the renderer is vanilla TS (no framework), rendering is throttled while idle, and it pauses while hidden.

### ADR-2: Character = procedural 2D vector shard rig, not 3D and not a sprite
**Context.** No authentic or licensed model exists (see the dossier). Capri's on-screen design is *flat, hard-edged polygon art* with sparkle texture and violet offset outlines.
**Decision.** Build an original rig in code: polygons attached to a bone hierarchy (root → hips → torso → neck → head → face parts, plus hair clusters with spring physics). Parameters like `turn`, `tilt`, `blink`, `mouthOpen`, `smile` and `browTension` deform and parallax the layers, Live2D-style. Rendering uses Canvas 2D with DPI-aware backing stores.
**Why not 3D.** A shaded 3D mesh would look *less* like her: the show draws her flat. Lit 3D would add cost and lose the graphic style. A Three.js toon render of flat polygons is essentially what the 2D rig already does.
**Why not sprites.** Sprites can't blink, lip-sync, or blend states without a large frame set. They also can't change resolution cleanly.
**Consistency.** Geometry is deterministic data, so her face can't drift between frames. Sparkle texture uses a fixed-seed PRNG.

### ADR-3: Text action protocol for tools (provider-agnostic)
The model requests actions with `<action>{"tool":…,"args":{…}}</action>` blocks. This works the same on local models with no native tool calling. Each request is parsed, validated with zod, checked against the policy, confirmed in the UI when required, and executed by trusted code. Results come back marked as *untrusted data*. The model can never run a shell or an arbitrary executable.

### ADR-4: Pluggable LLM providers with an offline floor
Providers: `ollama` (local, no key), `openai` (any OpenAI-compatible endpoint: OpenAI, LM Studio, llama.cpp server, OpenRouter…), `anthropic`, and `offline`. The offline provider is a deterministic responder that understands direct commands ("timer 5 minutes", "open github.com", "note: …"), so the app is useful with **no model at all** and never needs a paid service to start.

### ADR-5: Voice
- **TTS:** Chromium `speechSynthesis` uses Windows voices and works offline. Lip-sync is driven from `boundary` events plus a phoneme-free envelope. An optional OpenAI-compatible `/audio/speech` endpoint plays through WebAudio, where lip-sync follows the real amplitude. The voice is always labelled "substitute voice".
- **STT:** Offline through the Windows *System.Speech* dictation recognizer, run in a short-lived PowerShell child process on a recorded WAV. Optionally through an OpenAI-compatible `/audio/transcriptions` endpoint (cloud Whisper or a local faster-whisper server).
- **Wake word (opt-in):** a long-running System.Speech grammar recognizer for "hey Capri". It runs in one supervised child process, shows a visible mic indicator, and is killed on quit.

### ADR-6: Data
Everything lives in `%APPDATA%\Capri\` (`app.getPath('userData')`) as JSON written atomically (temp file + rename). Secrets are in `secrets.bin`, encrypted with DPAPI via `safeStorage`; if encryption is unavailable they're never written to disk. Logs are JSON lines with redaction, rotated at 2 MB × 3 files. There is no telemetry.

### ADR-8: Animation clip library
**Context.** The owner asked for "1000+ animations from the show". No animation data from the series is public. The studio animates Capri by hand in 2D, and she appears in only a few scenes of a series released four days ago. Ripping or rotoscoping footage would also redistribute copyrighted animation.
**Decision.** Ship an authored library of keyframed clips (`src/renderer/character/clips.ts`): 35 clips covering idle fidgets, gestures, reactions and emotes. Each clip carries an honest `source` field. Two are posed after official frames (`tilt_grin` ← frame #3, `front_stare` ← frame #1); the rest are `interpretation`. Clips layer over the behavior pose with per-param fade weights. Each playback randomises speed (±15%), amplitude (±20%, scaled by animation intensity) and mirroring. The always-on systems keep running underneath: gaze, blinking, breathing, hair physics and glitch. The behavior machine avoids repeating recent clips and uses only `subtle` clips during quiet hours or DND.
**Why not inflate the count.** Combinatorial variants could be counted as "thousands of animations", but that would misrepresent what was built. The test suite asserts the provenance labels.

### ADR-7: Fullscreen and focus etiquette
The character window is `focusable:false` and `skipTaskbar`, with an always-on-top level of `floating`. A 2-second watcher (`SHQueryUserNotificationState` + foreground-window rect via koffi FFI) hides Capri and pauses rendering while a fullscreen app or game is in front. If the FFI fails to load, the watcher degrades to a no-op and diagnostics report it.

### ADR-9: Google Gemini via the official SDK (Interactions API)
**Research (2026-10-24).** Read ai.google.dev `models`, `quickstart`, `interactions` and `text-generation`, plus the installed `@google/genai` 2.31.0 type definitions.
- The current recommended API is `ai.interactions.create`. Streaming arrives as `step.delta` events with `delta.type === 'text'`.
- Stateless history goes in as `user_input` / `model_output` steps, alongside `system_instruction`, `generation_config.max_output_tokens` and `thinking_level`.
- `store: false` keeps conversations off Google's servers.
- Gemini 3.6+ ignores `temperature`.

**Model choice, verified live with the key.**

| Model | Listed for this key | Non-stream reply | Stream (first token) | Multi-turn |
|---|---|---|---|---|
| `gemini-3.5-flash-lite` (stable, docs recommend for new projects) | yes | 3.0 s | 2.1–4.5 s; 0.65 s inside the app | correct |
| `gemini-3.1-flash-lite` (stable) | yes | 1.5 s | 5.1 s | correct |
| `gemini-3.8-flash` (stable, flagship Flash) | yes | **90 s** at `thinking_level=low`; rejects `minimal` | — | — |

**Decision.** Primary `gemini-3.5-flash-lite`, fallback `gemini-3.1-flash-lite`, `thinking_level: minimal`.
- The fallback is used only for "model not found" or persistent overload, and the UI shows "Connected via fallback model …".
- A failure never produces a mock reply.

**Retries.** The SDK's internal retries are disabled; there is one bounded policy instead:
- rate limit or overload: up to 2 retries, honouring the server's `retryDelay`
- network loss: 1 retry
- auth or bad request: no retry

Retries happen only before any text has streamed, so output is never duplicated.

**Keys.** Precedence:
1. a key saved in the app (DPAPI)
2. the `GEMINI_API_KEY` environment variable
3. `.env.local` next to the sources (development builds only)

`.env.local` is git-ignored and outside the packaged `files`. The key exists only in the main process and travels only in the `x-goog-api-key` header. Logs redact `AIza…` and `AQ.…` key formats. `npm run verify:package` scans every installed file and the asar listing for the key.

**Connection status.** `ConnectionMonitor` moves through connecting → connected / disconnected / error. It reports *connected* only after an authenticated `models.list` that contains the configured model, or after a real streamed reply. It re-checks on settings or key changes, on system resume, and every 5 minutes.

### ADR-10: Desktop teleportation
The native transparent window really moves. Here's the sequence:
1. `TeleportController` picks a spot with `chooseDestination`. The spot is fully inside a work area, a real distance away, never under the cursor, avoids covering the foreground app, and can be a corner, side, beside the cursor or another monitor.
2. Main sends `teleport:out`; the renderer plays the departure effect and acknowledges.
3. Main calls `setBounds` and saves the spot.
4. Main sends `teleport:in`; the renderer plays the arrival effect and then an observed pose clip.

Each acknowledgement has a timeout, so a stalled renderer can't strand her mid-teleport.

**Autonomous teleports** happen at random intervals within user limits, only while the AI connection is `connected`. They're held back during a conversation, while listening or being dragged, during fullscreen, DND or quiet hours, and when the user is away. **Manual teleports** (tray, `Ctrl+Alt+P`, panel, "teleport" / "come here" commands, the AI's `teleport` tool) always work.

**Effect design.** Chromatic violet/green split, scan-band tearing, a many-eyes flash, collapse to a green scanline and a shard burst; arrival reverses this with a slight overshoot. It's grounded in her observed glitch-shard and many-eyes visuals. The dissolve itself is an inference, because she enters by hard cuts in the show.

### ADR-11: AI → character through structured actions only
The model can't drive the renderer. It may request `emote {emotion ∈ 23 fixed values}` and `teleport {where ∈ 7 fixed values}` through the same validated `<action>` protocol as every other tool. These "cosmetic" actions:
- default to *allow* and aren't escalated by taint
- don't trigger a follow-up model round
- don't clutter the chat log

Phases (listening, thinking, speaking, error) drive the behavior state machine. Lip-sync beats any gesture clip, and errors or interruptions always return her to idle (tested).

### ADR-12: Design system
One stylesheet with tokens taken from the verified palette:
- ink surfaces
- neon green for live/primary states (her mask)
- crimson for emphasis and danger (her hair)
- blue for speaking/info (her eyes)
- violet offset shadows (her outline)

Other choices:
- **Shard-cut corners** on panels, buttons and chips.
- **Type:** Bahnschrift, Windows' built-in DIN-style technical face, for labels; Segoe UI Variable for reading; Cascadia Mono for data.
- **Icons:** a custom angular SVG set, with her almond eye as the brand mark. Built as DOM nodes so they work under the strict CSP.
- **Motion:** minimal (≤220 ms enter, blinking status gems), and respects `prefers-reduced-motion`.
- **Not themable:** the Windows tray menu is a native menu, so it can't use the design system.

### ADR-13: Off-screen test mode
With `CAPRI_TEST=1 CAPRI_OFFSCREEN=1`, every harness (unit/e2e/preview/perf/icon) renders windows off-screen and never shows them, never registers global shortcuts or a tray icon, and never posts notifications. Automated runs don't disturb the user's desktop. Set `CAPRI_ONSCREEN=1` to watch the tests instead.
