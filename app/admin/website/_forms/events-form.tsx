"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventsSchema, type EventsFormValues } from "@/schemas/website-content";
import { saveEvents } from "@/features/website-cms/actions";
import {
  AddButton,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  useCmsSubmit,
} from "./form-kit";
import { ImageField } from "./image-field";

/**
 * The events template's own blocks.
 *
 * The part of an event stylist's site that changes most: they style a wedding,
 * they get the photographs back, and it should go up. Everything else on their
 * page can sit still for a year.
 *
 * Organised by what the owner SEES as they scroll — the three cards under the
 * hero, then the grid of work, then how they work, then the enquiry form —
 * rather than by the shape of the stored document. Each group says where on
 * the page it lands, because a form this long is only navigable if it reads
 * like the page.
 */
export function EventsForm({
  defaultValues,
  businessId,
}: {
  defaultValues: EventsFormValues;
  businessId: string | null;
}) {
  const form = useForm<EventsFormValues>({
    resolver: zodResolver(eventsSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveEvents);

  const cards = useFieldArray({
    control: form.control,
    name: "portfolio.items",
  });
  const events = useFieldArray({
    control: form.control,
    name: "showcase.items",
  });

  /*
   * `useWatch`, not the `watch()` returned by useForm: the latter hands back
   * a fresh object every render and the React Compiler bails out of
   * optimizing the whole component — which, on a form this size, is the
   * component that needs it most. Same reason as the branding form.
   *
   * Both lists earn the subscription. The categories feed the hint under a
   * card's filter, so an owner adding "Christenings" to an event sees it
   * offered above without saving first — a card naming a category no event
   * carries narrows nothing, silently. And a row collapsed among twenty
   * others is only findable if its header says which event it is.
   */
  const watchedCards = useWatch({
    control: form.control,
    name: "portfolio.items",
  });
  const watchedEvents = useWatch({
    control: form.control,
    name: "showcase.items",
  });

  const categories = Array.from(
    new Set(
      (watchedEvents ?? [])
        .map((item) => item?.category?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  );

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-8">
      <p className="text-xs leading-relaxed text-admin-muted">
        Your portfolio, the events you have styled, how you work, and the
        questions your enquiry form asks. This is the part of your site worth
        coming back to — every event you add appears in the grid and in the
        filter above it.
      </p>

      <section className="grid gap-3">
        <SubHeading>Hero extras</SubHeading>
        <p className="text-xs leading-relaxed text-admin-muted">
          Two parts of the top of your page that are particular to this design.
          The main photograph, its description and the status pill are under
          Hero.
        </p>
        <ImageField
          form={form}
          name="hero.backdrop"
          label="Background wash"
          businessId={businessId}
        />
        <p className="text-[0.65rem] text-admin-muted">
          Sits behind your opening words at a fifth of its strength, under a
          cream tint. It is decoration, so it needs no description — pick
          something soft rather than something to look at.
        </p>
        <TextField
          form={form}
          name="hero.badgeLine"
          label="Second line of the badge"
          placeholder="Season 2026"
          hint="Under the status pill on the photograph. Blank shows the pill alone."
        />
      </section>

      <section className="grid gap-3">
        <SubHeading>Portfolio cards</SubHeading>
        <p className="text-xs leading-relaxed text-admin-muted">
          The three tall cards under your hero. Each one is its photograph, so
          pick shots you would be happy to see full height on a phone.
        </p>
        <TextField
          form={form}
          name="portfolio.heading.label"
          label="Eyebrow label"
          placeholder="Our Signature Events"
        />
        <TextField
          form={form}
          name="portfolio.heading.title"
          label="Title"
          placeholder="Featured Portfolio"
          hint="The last word is shown in gold italics."
        />

        {cards.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={watchedCards?.[i]?.title || `Card ${i + 1}`}
            onRemove={() => cards.remove(i)}
          >
            <ImageField
              form={form}
              name={`portfolio.items.${i}.image`}
              label="Photograph"
              businessId={businessId}
            />
            <TextField
              form={form}
              name={`portfolio.items.${i}.alt`}
              label="Describe the photograph"
              placeholder="A wedding aisle lined with white roses and hanging lanterns"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`portfolio.items.${i}.label`}
                label="Small label above the title"
                placeholder="Weddings"
              />
              <TextField
                form={form}
                name={`portfolio.items.${i}.title`}
                label="Title"
                placeholder="Grand Celebrations"
              />
            </div>
            <TextAreaField
              form={form}
              name={`portfolio.items.${i}.description`}
              label="Description"
            />
            <TextField
              form={form}
              name={`portfolio.items.${i}.filter`}
              label="Jumps to"
              hint={
                categories.length > 0
                  ? `Type one of your categories exactly and clicking this card filters the grid to it: ${categories.join(", ")}. Leave blank to just scroll down.`
                  : "Add some events below, then type one of their categories here to have this card filter the grid."
              }
            />
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() =>
            cards.append({
              label: "",
              title: "",
              description: "",
              image: "",
              alt: "",
              filter: "",
            })
          }
        >
          Add card
        </AddButton>
      </section>

      <section className="grid gap-3">
        <SubHeading>Events you have styled</SubHeading>
        <p className="text-xs leading-relaxed text-admin-muted">
          The grid below your portfolio. The filter chips above it are built
          from the categories you type here — add an event in a new category and
          its chip appears, so there is never a filter with nothing behind it.
          Remove every event to hide the whole section.
        </p>
        <TextField
          form={form}
          name="showcase.heading.label"
          label="Eyebrow label"
          placeholder="Recently Styled"
        />
        <TextField
          form={form}
          name="showcase.heading.title"
          label="Title"
          placeholder="Latest Events"
          hint="The last word is shown in gold italics."
        />
        <TextAreaField
          form={form}
          name="showcase.heading.subtitle"
          label="Line underneath"
        />
        <TextField
          form={form}
          name="showcase.allLabel"
          label="First filter chip"
          placeholder="All"
          hint="The chip that shows everything, before your categories."
        />

        {events.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={watchedEvents?.[i]?.title || `Event ${i + 1}`}
            onRemove={() => events.remove(i)}
          >
            <ImageField
              form={form}
              name={`showcase.items.${i}.image`}
              label="Photograph"
              businessId={businessId}
            />
            <TextField
              form={form}
              name={`showcase.items.${i}.alt`}
              label="Describe the photograph"
              placeholder="Bride and groom beneath an arch of ivory roses at dusk"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`showcase.items.${i}.title`}
                label="What it was"
                placeholder="Castillo-Rivera Grand Wedding"
              />
              <TextField
                form={form}
                name={`showcase.items.${i}.category`}
                label="Category"
                placeholder="Weddings"
                hint="Becomes a filter chip. Spell it the same way each time."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`showcase.items.${i}.venue`}
                label="Where"
                placeholder="The Peninsula Manila"
                hint="Leave blank to print nothing."
              />
              <TextField
                form={form}
                name={`showcase.items.${i}.date`}
                label="When"
                placeholder="June 14, 2026"
                hint={'Printed as written — "June 2026" is fine.'}
              />
            </div>
            <TextAreaField
              form={form}
              name={`showcase.items.${i}.description`}
              label="Description"
            />
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() =>
            events.append({
              category: "",
              title: "",
              venue: "",
              date: "",
              description: "",
              image: "",
              alt: "",
            })
          }
        >
          Add event
        </AddButton>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            form={form}
            name="showcase.cta.label"
            label="Button under the grid"
            hint="Leave blank for no button."
          />
          <TextField form={form} name="showcase.cta.href" label="Button link" />
        </div>
      </section>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
