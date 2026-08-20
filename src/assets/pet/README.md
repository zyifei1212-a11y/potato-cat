# Real pet assets

`PetCat.tsx` loads assets from these state folders before falling back to the
CSS cat. Keep the existing filenames to replace art without touching business
logic:

- `idleLoaf/cat.png`
- `focusTyping/cat.png`
- `focusTyping/left-press.png`
- `focusTyping/right-press.png`
- `hoverLook/cat.png`
- `sleepBreathing/cat.png`
- `dragLift/cat.png`
- `breakOverlay/walk.png`
- `breakOverlay/settle.png`
- `breakOverlay/rest.png`
- `breakOverlay/break-reminder.mp4` (one-shot walk-in and belly-roll intro)
- `breakOverlay/quiet-loop.mp4` (settled belly-up breathing and blinking loop)
- `bagEasterEgg/cat.png`

PNG or WebP files should have a transparent background, include the full cat
and its props, and use generous padding so animation does not clip. When using
WebP, update only the matching import in `PetCat.tsx`.
