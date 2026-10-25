# Animation reference catalog

How observed movement maps to the desktop implementation. **Obs** = directly observable in the reference; **Inf** = inferred or interpreted. Timestamps refer to the Netflix clip `5wGdjjwoDbY` (see [REFERENCE_BOARD.md](REFERENCE_BOARD.md)).

| # | Observed movement / pose | Source | Obs / Inf | Implementation |
|---|---|---|---|---|
| 1 | Pose holds ~5 s while only the glitter shimmers | N 1:49–1:54 | Obs | `snap` clip easing (fast move, long hold); idle glitter twinkle always running; low idle sway |
| 2 | Arms flung wide, long claws spread ("reveal") | N 1:51 | Obs | clip `reveal_spread` (arms horizontal, fingers splayed, chin up) — used on teleport arrival and greetings |
| 3 | Head tilted down-to-side with open jagged grin | W3, N 0:34 | Obs | clip `tilt_grin` (now `snap` eased), teeth mouth shape |
| 4 | Eyes narrow to slits | N 2:06 | Obs | `squint` param narrows the almond eye shape itself; clips `menace`, `pout`, `eye_roll` |
| 5 | Many eyes bloom across the mask | N 2:14 | Obs | `manyEyes` param (0–1) grows deterministic extra almond eyes; used in `surprise_flinch`, `many_eyes`, teleport departure/arrival, AI "thinking hard" |
| 6 | Eyes shift within the sockets between holds | N 1:55–1:57 | Obs | iris offset inside almond (gaze), snap-timed saccades in look-around |
| 7 | Glitch shards / fragmentation | N 2:54 | Obs | `glitch` post-process (band displacement), shard burst particles in teleport FX |
| 8 | Looming over someone (huge, leaning in) | N 2:34–2:42 | Obs | clip `loom` (float up, lean forward, eyes wide, slight scale-up) — used when the user asks something dramatic |
| 9 | Appears by hard cut | N 1:48.8 | Obs (editing) | teleport arrival includes a 1–2 frame "cut" flash before reassembly |
| 10 | Teleport departure: vertical scan collapse + chromatic split + shard scatter | — | Inf | `TeleportFx` departure (≈420 ms) |
| 11 | Teleport arrival: shards converge, many-eyes flash, then reveal pose | — | Inf | `TeleportFx` arrival (≈520 ms) + `reveal_spread` |
| 12 | Blinking | — | Inf (not observed in the clip; needed for life) | almond closes to a slit; random 2–6 s, double blinks |
| 13 | Cursor tracking | — | Inf | gaze + head yaw toward the pointer when near |
| 14 | Speaking | N 0:34 (grin) | Partly obs | mouth open/teeth by lip-sync envelope; mask glow pulses |
| 15 | Thinking | — | Inf | gaze up-left, hand to chin, mask pulse, light glitch, occasional many-eyes flicker |
| 16 | Sleep | — | Inf | eyes closed slits, head droop, Z's, 15 fps |

Clip easing modes:
- `smooth`: smoothstep between keys, for natural interpolated gestures.
- `snap`: the transition takes 15% of each segment, then holds, approximating Trigger's limited-animation holds observed at N 1:49–1:54.

## v3: postures (legs, hips, lean)

The rig's legs are now two-bone chains (thigh/shin/foot) with foreshortening, so she can sit, curl up, recline, lean and dash. A **posture** is held for 1–4 minutes, like the show's long held frames, and is chosen to fit where she is on the desktop. Clips, conversation states and lip-sync layer on top.

| Posture | Source | Used when |
|---|---|---|
| `stand` | W1, B 4:08 | anywhere; after arriving |
| `contrapposto` | B 3:33 | taskbar, window, air |
| `sit_edge` | W2, N 2:22 | on the taskbar or perched on a window top (seat exactly on the edge; the far leg dangles behind it) |
| `air_sit` | B 0:23 | floating mid-air; also how she dozes in the air |
| `recline` | B 0:48 | floating mid-air |
| `power_stance` | B 1:23, B 4:53 | occasionally, and on request |
| `peek_left` / `peek_right` | B 0:28, 4:48, 2:13 | half off a screen edge |
| `balance` | B 0:18 | standing on a window top |

**Desktop placement that drives postures:**
- **Taskbar:** the default spot; she stands on it or sits on it.
- **Perch:** she sits on the top edge of the window you're using. If that window moves or closes, she startles and jumps to safety.
- **Peek:** she leans in from a screen edge.
- **Air:** anywhere else.
- **Glide:** short hops on the same screen are sometimes a dash, with the hair streaming (B 4:03), instead of a teleport.

**Dozing and dragging:** asleep, she slumps sitting on a ledge or curls up in the air. While you drag her she stands. Conversation never makes her jump up from a posture.

**AI control:** the AI can request postures through the validated `emote` action (`sit`, `stand`, `recline`, `curl_up`, `power_stance`). It can also move her through `teleport` with `perch` / `peek`. The right-click menu has a *Pose* submenu.

**Not observed in the footage, so not implemented:** walking. She floats, dashes and appears by hard cuts. Crouching, kneeling and lying flat aren't in the sampled footage either.

## v4: real-footage poses (default art)

She is now drawn from cut-outs of the show itself (`assets/capri`, see its SOURCES.md). This is how desktop-pet projects like Shimeji and Desktop Mate work: a set of poses, each a short run of drawings, chosen by what she is doing.

| Pose | From | Used when |
|---|---|---|
| `stand` | N 1:49–1:54 (67 drawings) | standing or floating; contrapposto, balance, being dragged |
| `sit` | N 2:21–2:25 | sitting on the taskbar or a window top (alternates with `lounge`) |
| `lounge` | N 1:27–1:37 (48 drawings): on her front, chin propped, legs up | on a ledge; reclining |
| `lie` | N 0:29–0:31: lying on her side | asleep; reclining |
| `glitch` | B 4:19–4:21: her glitch-out drawings | flashed in her place during tear and ghost glitch bursts |

The show's own drawings and holds are kept; it runs on twos and threes. On top of them she gets:
- a float bob and breathing
- mirroring to face where she's looking (the snap round is a glitch frame, like a cut)
- dangling and swinging from the grab point while dragged
- glitch bursts: band-slice dislocation, flying shards, a hue-shifted ghost and stutter frames
- a squash on a poke and sparkles on a head pat

The vector rig (v1–v3) remains as `character.art = 'vector'`.
