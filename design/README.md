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
| `logo.png`                  | mark + wordmark         | transparent; for DARK surfaces |
| `logo-light.png`            | mark + wordmark         | ALIAMZ recoloured to ink `#1c1a17`; for LIGHT surfaces |

The strapline is excluded from every derived asset.

### Two things that are easy to get wrong

**Cutting the background.** It is essentially black, so an anti-aliased edge
pixel is `alpha × colour`. Dividing the colour back out (un-premultiplying)
removes the dark fringe that a plain threshold leaves around every letterform on
a light page.

**The wordmark is white.** It disappears on the light marketing surface
(`#faf9f7`), which is the entire reason `logo-light.png` exists. Only the ALIAMZ
band is recoloured — the mark and the gold DIGITAL are untouched, and that band
is isolated in the source so nothing else is affected.
