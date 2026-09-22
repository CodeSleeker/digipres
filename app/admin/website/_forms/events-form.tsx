"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventsSchema, type EventsFormValues } from "@/schemas/website-content";
import { saveEvents } from "@/features/website-cms/actions";
import {
  AddButton,
  RepeatableRow,
  StringListField,
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
  const stats = useFieldArray({
    control: form.control,
    name: "approach.stats",
  });
  const eventTypes = useFieldArray({
    control: form.control,
    name: "inquiry.eventTypes",
  });
  const budgets = useFieldArray({
    control: form.control,
    name: "inquiry.budgetRanges",
  });
  const serviceNeeds = useFieldArray({
    control: form.control,
    name: "inquiry.serviceNeeds",
  });
  const legal = useFieldArray({ control: form.control, name: "footerLegal" });
  const topics = useFieldArray({
    control: form.control,
    name: "inquiry.consultation.topics",
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

      <section className="grid gap-3">
        <SubHeading>How you work</SubHeading>
        <p className="text-xs leading-relaxed text-admin-muted">
          The photograph and figures on the dark band, under your services. This
          is where someone finds out what actually happens after they get in
          touch.
        </p>
        <ImageField
          form={form}
          name="approach.image"
          label="Photograph"
          businessId={businessId}
        />
        <TextField
          form={form}
          name="approach.imageAlt"
          label="Describe the photograph"
          placeholder="A styling team laying out florals along a banquet table"
        />
        <TextField
          form={form}
          name="approach.label"
          label="Eyebrow label"
          placeholder="How It Works"
        />
        <StringListField
          form={form}
          name="approach.titleLines"
          label="Heading"
          hint="One line per row. The last line is shown in gold italics."
        />
        <TextAreaField
          form={form}
          name="approach.text"
          label="How you work"
          hint="A short paragraph. Walking through it step by step reads well here."
        />

        {stats.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Figure ${i + 1}`}
            onRemove={() => stats.remove(i)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`approach.stats.${i}.value`}
                label="Figure"
                placeholder="500+"
              />
              <TextField
                form={form}
                name={`approach.stats.${i}.label`}
                label="What it counts"
                placeholder="Events Styled"
              />
            </div>
          </RepeatableRow>
        ))}
        <AddButton onClick={() => stats.append({ value: "", label: "" })}>
          Add figure
        </AddButton>
      </section>

      <section className="grid gap-3">
        <SubHeading>Enquiry form</SubHeading>
        <p className="text-xs leading-relaxed text-admin-muted">
          The three dropdowns are yours to set. Only list what you actually take
          on — an option here is a question you are promising to answer.
          Enquiries arrive under Enquiries, and you get a text and an email.
        </p>
        <TextField
          form={form}
          name="inquiry.title"
          label="Form heading"
          placeholder="Tell us about your celebration"
          hint="The last word is shown in gold italics."
        />
        <TextAreaField form={form} name="inquiry.intro" label="Intro text" />

        <SubHeading>Kinds of event</SubHeading>
        {eventTypes.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Option ${i + 1}`}
            onRemove={() => eventTypes.remove(i)}
          >
            <TextField
              form={form}
              name={`inquiry.eventTypes.${i}.label`}
              label="Label"
              placeholder="Wedding"
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => eventTypes.append({ label: "" })}>
          Add kind of event
        </AddButton>

        <SubHeading>Budget bands</SubHeading>
        <p className="text-xs text-admin-muted">
          Remove them all to stop asking about budget at all.
        </p>
        {budgets.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Band ${i + 1}`}
            onRemove={() => budgets.remove(i)}
          >
            <TextField
              form={form}
              name={`inquiry.budgetRanges.${i}.label`}
              label="Label"
              placeholder="₱100,000 – ₱250,000"
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => budgets.append({ label: "" })}>
          Add band
        </AddButton>

        <SubHeading>Services they can tick</SubHeading>
        {serviceNeeds.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Service ${i + 1}`}
            onRemove={() => serviceNeeds.remove(i)}
          >
            <TextField
              form={form}
              name={`inquiry.serviceNeeds.${i}.label`}
              label="Label"
              placeholder="Florals and décor"
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => serviceNeeds.append({ label: "" })}>
          Add service
        </AddButton>

        <SubHeading>After they press send</SubHeading>
        <TextField
          form={form}
          name="inquiry.successTitle"
          label="Heading"
          placeholder="Your enquiry is with us"
        />
        <TextAreaField
          form={form}
          name="inquiry.successText"
          label="What happens next"
          hint="They are also shown a reference code, which appears beside the enquiry in your inbox."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            form={form}
            name="inquiry.messengerCta.label"
            label="Messenger button"
            placeholder="Continue on Messenger"
            hint="Leave blank for no button."
          />
          <TextField
            form={form}
            name="inquiry.messengerCta.href"
            label="Messenger link"
            placeholder="https://m.me/yourpage"
          />
        </div>
      </section>

      <section className="grid gap-3">
        <SubHeading>Booking a consultation</SubHeading>
        <p className="text-xs leading-relaxed text-admin-muted">
          Turns your enquiry form into two: one for questions about an event,
          one for booking a time to talk. A consultation goes in your
          appointments; an enquiry does not. Clear the heading to remove the
          choice and keep the enquiry form on its own.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            form={form}
            name="inquiry.consultation.enquiryLabel"
            label="First option"
            placeholder="About an event"
          />
          <TextField
            form={form}
            name="inquiry.consultation.bookingLabel"
            label="Second option"
            placeholder="Book a consultation"
          />
        </div>
        <TextField
          form={form}
          name="inquiry.consultation.title"
          label="Heading"
          placeholder="Let's find a time to talk"
          hint="Clearing this removes the whole choice. The last word is shown in gold italics."
        />
        <TextAreaField
          form={form}
          name="inquiry.consultation.intro"
          label="Intro text"
        />

        <SubHeading>What a consultation is about</SubHeading>
        {topics.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Topic ${i + 1}`}
            onRemove={() => topics.remove(i)}
          >
            <TextField
              form={form}
              name={`inquiry.consultation.topics.${i}.label`}
              label="Label"
              placeholder="Wedding"
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => topics.append({ label: "" })}>
          Add topic
        </AddButton>

        <SubHeading>After they request a slot</SubHeading>
        <TextField
          form={form}
          name="inquiry.consultation.successTitle"
          label="Heading"
          placeholder="Your slot is requested"
        />
        <TextAreaField
          form={form}
          name="inquiry.consultation.successText"
          label="What happens next"
          hint="Say that you will confirm — nothing is booked in until you do."
        />
      </section>

      <section className="grid gap-3">
        <SubHeading>Footer small print</SubHeading>
        <p className="text-xs leading-relaxed text-admin-muted">
          The links beside your copyright at the very bottom of the page — a
          privacy policy, terms. Remove them all to show nothing there.
        </p>
        {legal.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Link ${i + 1}`}
            onRemove={() => legal.remove(i)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`footerLegal.${i}.label`}
                label="Link text"
                placeholder="Privacy Policy"
              />
              <TextField
                form={form}
                name={`footerLegal.${i}.href`}
                label="Where it goes"
                placeholder="/privacy"
              />
            </div>
          </RepeatableRow>
        ))}
        <AddButton onClick={() => legal.append({ label: "", href: "" })}>
          Add link
        </AddButton>
      </section>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
