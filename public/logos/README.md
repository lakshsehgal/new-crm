# Brand assets

Drop your logo and favicon here (or at the favicon path below) to rebrand
the CRM — no code changes required.

## Sidebar logo

**File:** `public/logos/logo.png` (committed to Git)

The sidebar's top-left slot loads this file directly and renders it on the
dark background without any text or extra styling. Whatever you upload is
what appears.

### Recommendations

- **Format:** PNG with a transparent background works best since the
  sidebar is dark. SVG also supported — same filename, just rename the
  `<img src>` in `src/app/app/layout.tsx` to `logo.svg`.
- **Dimensions:** Logo is capped at ~36 px tall and fills the available
  width while preserving aspect ratio. Any horizontal logo ~120×36 or
  square logo ~36×36 looks great. Upload at 2× (so ~72 px tall) to keep
  it crisp on Retina displays.
- **File size:** Under ~80 KB keeps the sidebar snappy on first paint.

### Workflow to swap

1. Replace `logo.png` in this folder.
2. Commit + push to your deployment branch.
3. Vercel redeploys (~60 s) and the new logo appears.

---

## Browser favicon

**Primary file:** `public/logos/favicon.png` (drop yours here)
**Fallback:** `public/logos/favicon.svg` (purple gradient "N", shipped default)

The browser tab icon is wired up via the root layout's `metadata.icons`
config, which tries `favicon.png` first and falls back to `favicon.svg`
if the PNG isn't there. You don't have to touch any code.

### To customize

1. Drop your favicon into this folder as `favicon.png` (exactly that
   filename). 
2. Optionally add an iOS home-screen icon at 180×180 with the same
   filename (`favicon.png` is reused for Apple touch icon).
3. Commit + push. The tab icon updates after Vercel redeploys.

### Recommendations

- **PNG at 512×512** — stays sharp on Retina + looks great in Android's
  "add to home screen" slot.
- Keep it **square**. Favicon slots are tiny and anything rectangular
  gets letterboxed awkwardly.
- File size under 50 KB so page TTFB isn't affected.

### What happens without a custom favicon

The default `favicon.svg` in this folder is a purple gradient "N"
matching the CRM's fallback brand. Perfectly usable until you upload
your own.
