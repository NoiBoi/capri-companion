# Capri — Character Reference Dossier

Research date: 2026-10-24 (four days after *Cyberpunk: Edgerunners 2* premiered on 2026-10-20).
Source manifest: [`reference/SOURCES.md`](../reference/SOURCES.md).

Confidence legend: **V** = verified directly against an official frame, **S** = secondary source (wiki or review, not checked against the show), **I** = creative interpretation made for this app.

## 1. Identity (canon)

| Fact | Conf. | Source |
|---|---|---|
| Name "Project Capricorn", alias "Capri". | S | Cyberpunk Wiki |
| A *personality construct*: many digitised human psyches merged into one. | S | Wiki, quoting Ep. 4 |
| Self-description: "a collection of human psyches… rolled into one, beautiful me. Powerful, like an A.I., but born of humans." | S | Wiki quote, Ep. 4 |
| Made by Kyoko and Arasaka, originally as a cyber-weapon, later scrapped. Stored on an Arasaka biochip. | S | Wiki, reviews |
| Visible only to people who slot the chip (D, and later Talia Yang); she needs a compatible human host. | S | Wiki, reviewgeek Ep. 4 |
| Voice: Brittany Lauda (English), Aoi Koga (Japanese). | S | Wiki infobox (community-edited) |
| Infobox: hair "Pink", eyes "Blue". | S | Wiki |

## 2. Visual design (verified against three official frames)

Capri isn't drawn like a conventional anime girl. Studio Trigger renders her as a **flat, hard-edged, shard-built graphic figure**: a hallucination-style overlay drawn in a different style from the rest of the show.

### Silhouette (V)
- She is tall and thin, with long jagged legs.
- Her head is tiny next to the hair, which is the dominant shape: a huge angular cloud of slabs about 3× the width of her shoulders, rising well above her head.
- Long lightning-bolt strands of hair fall to her knees and below.
- The whole outline is made of straight segments and sharp points. There are no curves except the eyes.

### Hair (V)
- **Fill:** saturated crimson-pink, about `#F2154C` to `#FF1F55`.
- **Texture:** dense white/pale-pink sparkle speckle ("glitter static") over the red fill only.
- **Outline:** a violet/purple band (about `#7B3DF2` to `#9A4BFF`) offset down and to one side of each red slab, like a chromatic-aberration shadow.
- **Inner layer:** black spike shards sit between the red slabs, and spiky black bangs crown the head.

### Head and face (V)
- **Head:** near-black (`#0A0710`), angular, with a pointed chin and spikes radiating outward like a crown.
- **Mask:** a neon-green (`#22F27A` to `#2BFF88`) angular panel across the eye area, split vertically by a black notch between the eyes. Small green triangles sit below each eye.
- **Eyes:** round, wide and staring, built from concentric rings: black outer, green ring, thin white ring, bright blue iris (`#1D6CFF` to `#2A84FF`), dark navy centre and a white catch-light dot. They are slightly asymmetric when her head tilts.
- **Mouth:** a thin white zigzag line, a jagged grin. When open it's dark with white jagged teeth (seen in the ¾ frame).
- **Nose:** none. There are no other facial features.

### Body and "clothing" (V)
- A slim black body built from shards; no fabric detail is visible.
- The colour panels are **asymmetric**: neon-green panels down one side (shoulder, chest, hip, outer leg) and crimson lightning/geometric glyphs on the other side of the torso.
- Violet rim edges appear on the shard boundaries.

### Rendering style (V)
- Flat fills with no gradients or soft shading. The only texture is the hair sparkle.
- The violet offset outline works as her "lighting".
- Because she's composited over normally shaded backgrounds, she reads as an overlay or projection.

### Angles available
- **Front:** wiki infobox frame (close-up of head and torso).
- **¾ with head tilt, looking down:** gallery frame 03.
- **Full body seated:** gallery frame 01.
- **No profile or back view** was found. Those angles are reconstructed (I).

## 3. Personality and voice

| Trait | Conf. | Note |
|---|---|---|
| Self-assured and somewhat vain ("beautiful me"). | S | Direct quote |
| Mischievous, curious about "what fun her power can bring". | S | Review paraphrase |
| Motivations are deliberately unclear in the show. | S | Multiple reviews |
| Forms a close bond with her host (D), who embraces the possession despite the risks. | S | Reviews |
| Playful, teasing tone; short, punchy lines; Night City slang ("choom", "preem", "nova"). | I | Assumed from the franchise register. Not verified for Capri. |
| Treats the user as her "host" or "choom" and is fond of them. | I | Adapted for a companion app |

The persona prompt ([`src/main/ai/persona.ts`](../src/main/ai/persona.ts)) labels each line *canon* or *interpretation*. The app never claims her biography beyond the facts above.

**Voice:** No authorised Capri voice or voice model exists. The app uses a **clearly labelled substitute** (Windows system voices, or a user-configured TTS endpoint), and the UI says so.

## 4. Existing assets (checked 2026-10-24)

| Asset | Provenance | License | Usable? |
|---|---|---|---|
| Official 3D model, rig or textures | None published | — | No |
| Sketchfab "Capri (Project Capricorn)" by 0x00001337, 5.6k faces, posted 2026-10-24 | Fan | None stated, download disabled | No |
| GitHub `Seth666h/capri-cyberpunk-Desktop-pet` (PyQt, 4 static PNGs) | Fan | No license file | No (static sprites, unlicensed) |
| VRM / MMD / Live2D / Booth / VRoid Hub | None found | — | — |

**Conclusion:** no authentic or legally usable Capri model exists. The app ships an **original vector reconstruction** built procedurally from the verified references. It isn't the studio's artwork and doesn't claim to be identical to it.

## 5. Visual fidelity decisions

- **Rendering approach:** a 2D vector shard rig, not 3D (see ARCHITECTURE ADR-2). Her on-screen design is flat polygon art, so flat polygons reproduce it more faithfully than a shaded mesh would.
- **Matched to the frames:**
  - silhouette proportions (tiny head, hair mass about 3× shoulder width, knee-length lightning strands)
  - crimson glitter hair with a violet offset outline
  - black horn-like crown spikes
  - split neon-green mask with cheek triangles
  - concentric blue eyes with a white catch-light
  - thin white zigzag mouth that opens to a dark jagged grin
  - asymmetric green and crimson body panels
- **Reconstructed:** arms and hands (barely visible in the frames), the standing pose (frame #1 is seated), side and back views, every expression other than the stare and the ¾ grin, and all motion.
- **Consistency:** all geometry is static data and the glitter uses fixed seeds, so her face and hair never change between frames or sessions.
- **Animation provenance:** 35 clips. `tilt_grin` is posed after frame #3 and `front_stare` after frame #1; the other 33 are interpretation (ADR-8).

## 6. Uncertainties and how to resolve them

1. **Profile, back and full-standing views.** Resolve by checking more episode frames or official art books when published. The rig's `turn` parameter currently extrapolates from the ¾ frame.
2. **Exact palette values.** These were sampled from compressed web screencaps. A Blu-ray-quality frame would allow tighter values. All colours live in one table (`src/renderer/character/palette.ts`).
3. **Animation style.** In the show she appears to "pop" between poses with glitch jitter. The app uses smooth interpolation with optional glitch flicker, an interpretation.
4. **Personality depth.** Only a few lines were verified. Rewatching episodes 4–8 would let the persona be expanded with confidence labels.
5. **Voice.** An authorised voice would require a licence from the rights holders (CD PROJEKT / Studio Trigger / Netflix and the voice actors).
