# Capri art pack (real footage)

These poses are cut-outs of Capri taken directly from *Cyberpunk: Edgerunners 2* footage. The footage is © CD PROJEKT, Studio Trigger and Netflix.

The pack is for **private, personal use only**, so builds that include it must not be distributed. To get a shareable build, set `character.art` to `vector`; that mode uses the original procedural rig and contains no studio artwork.

| Pose | Source clip | Time |
|---|---|---|
| `stand` | "The Moment D Meets Capri", Netflix (YouTube `5wGdjjwoDbY`) | 1:49–1:54 |
| `sit` | same | 2:21–2:25 |
| `lie` | same | 0:29–0:31 |
| `lounge` | same | 1:27–1:37 |
| `glitch` | "Capri is a baddie" compilation of Netflix footage (YouTube `Nli_SZ-DBco`) | 4:19–4:21 |

**How they were made:**
1. Every frame of the clips was scanned for her palette (crimson, pink glitter, green, violet).
2. In the chosen shots, each unique drawing was kept along with its original hold, since the show animates on twos and threes.
3. Each drawing was cut out with a palette key, plus the isnet-anime segmentation model run on a tight crop around her.
4. Edges where the original shot cropped her were feathered.

`poses.json` lists, for each pose:
- its frames and holds
- the anchor point that rests on a ledge
- which way she faces
- its kind and size
