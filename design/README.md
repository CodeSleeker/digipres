# Design source files

Original artwork. **Not shipped** — nothing here is imported or served, so it
stays out of the bundle and out of `public/`. Kept in the repo so the brand
assets can be regenerated rather than re-traced.

## aliamz.png

The full Aliamz Digital logo: AD mark, ALIAMZ DIGITAL wordmark, and the
"DIGITAL SOLUTIONS. REAL IMPACT." strapline. 1254×1254, near-black background
(`rgb 1,4,11`).

Everything in `public/brand/` is derived from it. Measured content bands:

| band | rows     | content            |
| ---- | -------- | ------------------ |
| mark | 236–709  | x 303–947          |
| ALIAMZ | 769–868 | x 213–1047        |
| DIGITAL | 902–940 | x 214–1047       |
| strapline | 976–996 | x 252–1010      |

### Derived assets

| file                        | contents                | notes |
| --------------------------- | ----------------------- | ----- |
| `icon-192.png` `icon-512.png` | mark only, ink tile   | browser tab; rounded |
| `apple-icon.png`            | mark only, ink tile     | square — iOS applies its own mask |
| `mark.png`                  | mark only, transparent  | |
| `wordmark.png`              | ALIAMZ DIGITAL only     | transparent; horizontal, for wide lockups |
| `logo.png`                  | mark + wordmark         | transparent; for DARK surfaces |
| `logo-light.png`            | mark + wordmark         | ALIAMZ recoloured to ink `#171920`; for LIGHT surfaces |
| `og-image.png`              | 1200×630 share card     | referenced by `app/page.tsx`; see below |

### og-image.png — the link preview

1200×630 is what Facebook, LinkedIn, Slack and X all render largest and crop
least. Two things about the wiring are easy to get wrong and silent when you do:

- Open Graph requires an **absolute** image URL. `metadataBase` in
  `app/page.tsx` is what turns the relative path into one. Without it Next emits
  the bare path, every crawler fails the fetch, and the card quietly degrades to
  text with nothing logged anywhere.
- `og:image:width` / `height` are declared because several crawlers lay the card
  out from the tags before the file finishes downloading; omit them and the
  first render can collapse to a thumbnail.

Deliberately brand-only — no headline baked in. The title and description are
already shown as text beside the image, so repeating them in the picture just
competes with itself at thumbnail size.

The strapline is excluded from every derived asset.

### Two things that are easy to get wrong

**Cutting the background.** It is essentially black, so an anti-aliased edge
pixel is `alpha × colour`. Dividing the colour back out (un-premultiplying)
removes the dark fringe that a plain threshold leaves around every letterform on
a light page.

**The wordmark is white.** It disappears on the light marketing surface
(`#f8f9fb`), which is the entire reason `logo-light.png` exists. Only the ALIAMZ
band is recoloured — the mark and the gold DIGITAL are untouched, and that band
is isolated in the source so nothing else is affected.

## social/

Finished artwork for upload. Also not shipped.

| file                  | size     | for |
| --------------------- | -------- | --- |
| `facebook-cover.png`  | 1640×924 | Facebook Page cover |

### Facebook cover — why 1640×924

Facebook shows a cover at **820×312 on desktop** and **640×360 on mobile**, and
those aspect ratios disagree (2.63 vs 1.78). No single image satisfies both, so
this is sized to the taller mobile ratio and the desktop view crops a central
band out of it. Everything that matters therefore sits in the middle:

- inside the central **624px** band desktop keeps,
- inside a central **1180px** column so the narrower mobile crop can't clip it,
- clear of the **bottom-left**, where the profile picture overlaps on desktop.

Rendered from the live site's own fonts and brand PNGs rather than re-typeset,
so the wordmark is the real artwork and not a lookalike. Regenerate by asking —
it was produced from a throwaway route screenshotted at exact pixel size, from a
PRODUCTION build: the dev server paints its own indicator badge into the corner,
which ends up baked into the export.
