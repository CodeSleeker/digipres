import type { BusinessProfile, JournalEntry } from "@/types/business";
import { cn } from "@/lib/utils";
import { Frame } from "../components/frame";
import { Eyebrow } from "../components/section-head";
import { stagger } from "../lib/reveal";

/**
 * The journal — dated notes from the owner.
 *
 * The only section on the page about NOW rather than about what the place
 * permanently is, which is why it is also the only one that renders nothing
 * when empty: a retreat with no note to make should show no journal, not an
 * empty heading.
 *
 * Laid out in the design's existing vocabulary — a hairline rule per entry,
 * the date in clay small caps, the title in Cormorant — so it reads as part of
 * the page rather than as a bolted-on feed.
 */
export function Journal({ business }: { business: BusinessProfile }) {
  const journal = business.journal;
  if (!journal || journal.items.length === 0) return null;

  /*
   * Newest first, sorted here rather than trusted from storage.
   *
   * ISO dates sort correctly as plain strings, which is most of why the field
   * is stored that way. Sorting at render means an owner adding a missed entry
   * from last month doesn't have to drag it into place — and can't get the
   * order wrong.
   */
  const entries = [...journal.items].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <section
      id="journal"
      className="relative z-[1] bg-ivory py-[var(--lodge-section-lg)]"
    >
      <div className="lodge-shell">
        <div className="mb-[clamp(2.5rem,5vw,4rem)] grid grid-cols-[1fr_auto] items-end gap-8 max-[720px]:grid-cols-1 max-[720px]:items-start max-[720px]:gap-[1.6rem]">
          <div>
            <Eyebrow className="reveal">{journal.heading.label}</Eyebrow>
            <h2
              className="reveal mt-6 max-w-[16ch] font-lodge text-[clamp(2.5rem,5.6vw,5rem)] font-normal leading-[1.08] tracking-[-0.012em] text-bark [text-wrap:balance]"
              style={stagger(1)}
            >
              {journal.heading.title}
            </h2>
          </div>
          {journal.heading.subtitle && (
            <p
              className="reveal text-[0.7rem] uppercase tracking-[0.18em] text-sage"
              style={stagger(2)}
            >
              {journal.heading.subtitle}
            </p>
          )}
        </div>

        <div className="grid">
          {entries.map((entry) => (
            <Entry key={`${entry.date}-${entry.title}`} entry={entry} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Entry({ entry }: { entry: JournalEntry }) {
  return (
    <article className="grid grid-cols-[0.9fr_1.1fr] items-start gap-[clamp(2rem,5vw,4.5rem)] border-t border-[var(--lodge-rule)] py-[clamp(2.5rem,4vw,3.5rem)] max-[960px]:grid-cols-1 max-[960px]:gap-8">
      <div className="reveal" style={stagger(0)}>
        {/*
         * `<time>` with the machine-readable value, not just the printed one.
         * The visible text is formatted for a reader; `dateTime` is what a
         * crawler, a reader mode or an answer engine parses to know how fresh
         * this is — which is the entire point of a dated section.
         */}
        <time
          dateTime={entry.date}
          className="block text-[0.66rem] uppercase tracking-[0.2em] text-clay"
        >
          {formatDate(entry.date)}
        </time>
        <h3 className="mt-[1.4rem] font-lodge text-[clamp(1.6rem,2.6vw,2.4rem)] font-normal leading-[1.16] tracking-[-0.008em] text-bark [text-wrap:balance]">
          {entry.title}
        </h3>
        <p className="mt-[1rem] max-w-[46ch] font-light leading-[1.85] text-bark-soft [text-wrap:pretty]">
          {entry.text}
        </p>
      </div>

      {entry.images.length > 0 && (
        <div
          className={cn(
            "reveal grid gap-[clamp(0.7rem,1.4vw,1.1rem)]",
            // One photograph gets the full width and a generous crop; two or
            // more share a pair of columns, which is what keeps a four-image
            // entry from turning into a second gallery.
            entry.images.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
          style={stagger(1)}
        >
          {entry.images.map((image, i) => (
            <figure key={`${image.src}-${i}`} className="m-0">
              <Frame
                src={image.src}
                alt={image.alt ?? image.caption ?? ""}
                sizes={
                  entry.images.length === 1
                    ? "(max-width: 960px) 92vw, 50vw"
                    : "(max-width: 960px) 46vw, 25vw"
                }
                className={
                  entry.images.length === 1
                    ? "aspect-[16/10]"
                    : "aspect-[4/3]"
                }
              />
              {image.caption && (
                <figcaption className="mt-3 text-[0.66rem] uppercase tracking-[0.16em] text-sage">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </article>
  );
}

/**
 * "2026-08-02" → "2 August 2026".
 *
 * Fixed locale and a UTC timezone, both deliberate. The date is a calendar day
 * with no place attached, so letting it be formatted in the viewer's zone would
 * print the 1st for anyone west of UTC — and letting the locale float would
 * make the server and the browser disagree, which React reports as a hydration
 * error on a string nobody thought was dynamic.
 */
function formatDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}
