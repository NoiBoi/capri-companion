# CAPRI — fan trailer (Remotion)

A 92-second, 1920×1080, 30 fps cinematic trailer for the Capri desktop companion. It's cut to the 98 BPM score, with drops at 0:11 and 1:04.

## Restore the large assets

```bash
npm ci
```
```bash
node scripts/fetch-assets.mjs
```

The rig footage in `public/cap/` comes from the app itself. Run these from the app folder; they launch off-screen:

```bash
node scripts/capture-trailer.mjs full
```
```bash
node scripts/capture-trailer.mjs face
```

## Preview and render

```bash
npm run dev
```
```bash
npx remotion render CapriTrailer out/capri-trailer.mp4 --gl=angle --crf=18
```

`node scripts/stills.mjs 12 44 78` renders review stills to `out/stills/`.

On Windows, a project in a very deep folder can push Remotion's bundled browser path past `MAX_PATH`. If so, copy `node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64` to a short path and pass `--browser-executable=<that>\chrome-headless-shell.exe`. `stills.mjs` picks up `%TEMP%\rchrome` automatically.

## Structure

- `src/Trailer.tsx`: scene timing on the beat grid, glitch-hit schedule, score edit and sound-effect cues. Cue times are aligned to each effect's measured peak.
- `src/scenes.tsx`: the ten scenes (cold open → reveal → host → desktop arrival → feature montage → expression barrage → Gemini chat → build → drop 2 → end card).
- `src/desktop.tsx`: a stylised Windows 11 desktop, taskbar and editor window.
- `src/lib.tsx`: frame-sequence player, graded footage, decode/typed text, grain, scanlines, letterbox, and the SVG glitch filter.

Credits and licences for every asset are in [ASSETS.md](ASSETS.md).
