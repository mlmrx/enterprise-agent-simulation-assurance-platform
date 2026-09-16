# EASAP brand assets

The mark combines an evidence-led **E** with a green verification tick. Navy
`#081A33`, paper `#F5F8FC`, and assurance green `#77DDA0` match the product UI.

- `easap-mark.svg`: square vector mark used in the site header and footer.
- `easap-logo.svg` / `.png`: transparent horizontal logo for light backgrounds.
- `easap-logo-light.svg` / `.png`: reversed logo for dark backgrounds.
- `easap-mark-192.png` / `easap-mark-512.png`: square application artwork.

The wordmark is outlined: it does not require an installed font. Keep at least
one quarter of the mark's width as clear space around standalone placements.
Use the mark alone at small sizes, and do not recolor or stretch it.

Edit `public/brand/easap-mark.svg`, then run `npm run brand:build` to regenerate
the lockups, root favicon SVG/PNG/ICO files, and Apple touch icon. The generator
uses the Sharp dependency installed with Next.js. Generated assets are committed
so production serving does not need image generation.
