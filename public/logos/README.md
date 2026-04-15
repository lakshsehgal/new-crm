# Workspace logo

Drop your logo here to have it show up in the sidebar's top-left.

## How it works

The app's sidebar loads `/logos/logo.svg` by default. To use your own logo:

1. **Replace `logo.svg`** in this folder with your own file, keeping the filename
   exactly as `logo.svg`. It'll load automatically — no code change.
2. Or, if you want to use a raster image instead, drop it in as `logo.png`
   (or `.jpg`) and update the `<img src>` in
   `src/app/app/layout.tsx` to point at your file.

## Recommended format

- **SVG** preferred (sharp at any size, including Retina). Aim for a ~28×28
  or square aspect so it fits the sidebar's circular crop cleanly.
- **PNG** acceptable if you don't have a vector source. Use at least 128×128
  so it stays crisp on high-DPI displays.
- Keep the file under ~50 KB so the sidebar stays snappy on first paint.

## Size / position

The logo renders at roughly 28×28 pixels in a rounded square container with
a small inset. Most corporate logos look great; if yours has lots of text or
fine detail, consider using just the mark (not the wordmark) since the space
is compact.

## Versioning

Since this file is committed to Git, every deploy picks up whichever version
is on the current branch. Swap it per-environment by maintaining different
versions on different branches if needed.
