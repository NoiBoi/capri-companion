Current correction: 0.2.55 restores spoken screenshot reactions and improves the desktop voice direction. The 0.2.54 nonverbal-only screenshot policy described below is superseded. See REACTION_QUALITY.md.

# Capri 0.2.54: lived behavior improvements

Implemented in the active Capri checkout and packaged as 0.2.54. Existing uncommitted reliability work was preserved and incorporated. No extra runtime dependency or second behavior engine was added.

## What changed

- Automatic screenshot inspections are now nonverbal. They can establish a reading, direct her gaze, retain a curiosity, or request a closer look, but cannot deliver image captions as unsolicited speech. Later speech has to be a separate personal reaction or continuation, not a reading of the facts field. Direct user conversation remains available.
- Completed outings can provide an independent conversational opening based on her physical choice and the shared exchange, without another screenshot. These thoughts expire, yield to conversation, and use the existing request budget.
- An unrelated delivered chat answer and a harmless investigative glance no longer erase every unfinished interest. Explicit corrections, private exchanges, expiry and user controls still apply.
- A pending conversational thought waits until the speech lane is actually available. It no longer spends its single opportunity on a forced gesture while recent speech still blocks delivery.
- An unavailable initial capture gets bounded recovery attempts instead of becoming permanent familiarity. A genuinely returned subject can reopen attention. A settled view can be checked for changed content even when its window title stays the same. Unchanged accepted images reuse the prior reading without a model request.
- Accepted captures have distinct observation identities. New content in one window is no longer merged into the old observation merely because its title and process match.
- Outings now vary between a brief peek, a drifting visit, a wider survey, a closer investigation, and going directly to a settling place. Peeks and drifts can finish hovering rather than always perching. Neighboring safe spots can be approached by a glide, with the existing teleport fallback where a continuous route is obstructed.
- Route points stay fixed during safety checks and are replanned when geometry changes. Optional observation runs alongside the physical outing rather than freezing the movement executor while waiting for the provider.
- Quiet activity now has several small sequences with anticipation and a finish: peeking and leaning; balancing and fidgeting; stretching and swaying; floating and looking. Adjacent routines do not repeat. These work without screenshots or model calls and respect motion intensity and reduced-motion controls.
- Fresh visual evidence can justify one later revisit after the outing's rest. The same old unresolved question cannot repeatedly override visit memory.

## What was causing the regression

The decline had several interacting causes. Failed collection consumed a subject's first inspection eligibility before success was known. Model allowance was spent before checking whether a usable or changed image existed. Different captures shared identical observation text and were therefore deduplicated. Chat delivery and an investigative gesture both cleared interests prematurely. Follow-up opportunities could be consumed during the separate speech waiting period. Physical outings all used the same arrival, roam and perch structure, and small activities alternated through a fixed lean/stretch routine. Route planning also selected new random points on repeated checks rather than retaining a chosen path.

These are concrete implementation paths, not a claim that every quiet period had the same cause. Rest, quiet controls, provider failures, games, screen permissions and the user's absence can legitimately produce silence.

## Ongoing fixes incorporated

The pending changes include shared optional-request accounting, adaptive foreground attention, cancellation on relevant privacy/provider/focus changes, explicit timeout diagnostics, atomic JSON persistence and UTF-8 BOM handling, immediate settings persistence, and cancellable selected-voice startup waiting. They were retained rather than replaced.

## Controls and resource use

Existing quiet hours, focus, stay, sleep, hidden/fullscreen and game controls remain in place. Automatic visual capture still requires an explicit Allow policy and exposed content. A self-directed outing thought collects no screenshot. Optional ambient requests retain the ceiling of six attempts per ten minutes, with the shared ambient/memory ceiling of eight. Unchanged or unavailable images do not reserve a model attempt. New physical sequences need no provider calls.

The new code adds no background reflection loop, computer-input action, automatic memory approval, or additional service. Provider-generated speech can still be silent, and remains subject to anti-repetition and speech restraint.

## Validation

Validation results and deployment fingerprints are recorded in the accompanying validation report. All 501 unit tests passed, and TypeScript validation passed. Focused Electron checks cover automatic caption suppression, independent screenshot-free initiative, delayed follow-through, changed-image identity, unavailable-capture allowance, privacy cancellation, production profile persistence, physical interruption, sleep controls and developer outings.

One real configured Codex request was made against a synthetic shared-exchange fixture with screenshots disabled and no user data. It returned a valid silent decision because the character's choice had already been acknowledged. This establishes the provider and delivery path, not that speech quality or naturalness is solved. No repeated model sampling was used to select a flattering example.

## Remaining limits

This is an incremental experiential improvement using the existing artwork and execution infrastructure. The small gestures transform the existing art; they are not new hand-drawn animation frames. Movement still needs safe exposed space and can be quiet for deliberate rests. Exact image fingerprints avoid identical images but do not measure semantic image similarity. Generated personality and taste remain model-dependent. A focused regression selection does not establish that the entire end-to-end suite passes or that multi-hour everyday behavior is natural. The user's lived feedback remains the meaningful test of personality and pacing.

## Deployment

The final 0.2.54 build passed 501 unit tests, TypeScript validation, and all 24 selected packaged checks. The existing application was shut down normally, backed up, replaced and restarted. Its running package matches the tested package. All 21 checked profile files were byte-identical during replacement; memory.json, history.jsonl and secrets.bin remained byte-identical after restart. Startup loaded the existing 40 approved memories without settings repairs.

The final focused run includes 16 attention/privacy/profile checks and eight movement/control checks; 129 unrelated cases in the larger app test file were intentionally not run. Earlier timing/fixture failures and their corrections are retained in Capri-test-validation.json. The installer and deployment fingerprint report accompany this review. A full prior application and stopped-profile backup are retained under this task's work/rollback-0.2.53 directory.
