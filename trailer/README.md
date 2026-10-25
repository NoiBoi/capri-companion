# CAPRI — fan trailer (Remotion)

A 92-second, 1920×1080, 30 fps cinematic trailer for the Capri desktop companion. It's cut to the 98 BPM score, with drops at 0:11 and 1:04.

## Restore the large assets

```bash
npm ci
```
```bash
node scripts/fetch-assets.mjs
```

The show clips in `public/show/` (`o`, `n` and `e`, listed in ASSETS.md) are downloaded with yt-dlp and transcoded to H.264. The real-footage cut-outs in `public/capri/` are a copy of the app's `assets/capri`.

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

- `src/Trailer.tsx`: the edit on the beat grid. It covers the cold open, drop 1, the show montage, the zap section, the close-up barrage, the breakdown, the build, drop 2 with the title, and the end card. It also holds the glitch hits on cuts, the score edit and the sound-effect cues.
- `src/show.tsx`: real show shots fitted to beat slots, real-footage cut-outs of her (original drawings and holds), the red zap bolt, and her glitch-out drawings.
- `src/lib.tsx`: graded footage, decode text, grain, scanlines, letterbox, and the SVG glitch filter.

Text is kept to one title and a few lines of five words or fewer, always in front of the picture.

Credits and licences for every asset are in [ASSETS.md](ASSETS.md).
