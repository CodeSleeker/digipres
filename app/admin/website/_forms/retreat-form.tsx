"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  retreatSchema,
  type RetreatFormValues,
} from "@/schemas/website-content";
import { saveRetreat } from "@/features/website-cms/actions";
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
 * The retreat template's own blocks.
 *
 * These are the parts of the design with no counterpart on another template —
 * plus the photographs that sit INSIDE otherwise-editable sections, which is
 * what made this the strangest gap in the CMS: an owner could rewrite all four
 * cards in "The Stay" and not the photograph between them.
 *
 * Organised by what the owner SEES as they scroll, not by the shape of the
 * stored document, and each group says where on the page it lands. A single
 * form for eight blocks is only navigable if it reads like the page.
 *
 * Most fields may be cleared, and clearing is meaningful: the template hides a
 * block whose essential field is empty, so this is also how an owner removes
 * the image break, the experience strip or the quotation from their site.
 */
export function RetreatForm({
  defaultValues,
  businessId,
}: {
  defaultValues: RetreatFormValues;
  businessId: string | null;
}) {
  const form = useForm<RetreatFormValues>({
    resolver: zodResolver(retreatSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveRetreat);
  const experience = useFieldArray({
    control: form.control,
    name: "experience.items",
  });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-8">
      <p className="text-xs leading-relaxed text-admin-muted">
        The parts of your page that aren&rsquo;t standard sections — the wide
        photographs, the full-width break, the experience strip and the
        quotation. Clearing the main field of a block removes that block from
        your site.
      </p>

      <section className="grid gap-3">
        <SubHeading>Where you are</SubHeading>
        <p className="text-xs text-admin-muted">
          Printed under the heading on your hero, in the mobile menu, and in
          your footer.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            form={form}
            name="place.locality"
            label="Town and province"
            placeholder="Dahilayan, Bukidnon"
          />
          <TextField
            form={form}
            name="place.country"
            label="Country"
            placeholder="Philippines"
          />
        </div>
      </section>

      <section className="grid gap-3">
        <SubHeading>Story photograph caption</SubHeading>
        <p className="text-xs text-admin-muted">
          The small line under the picture beside your story.
        </p>
        <TextField
          form={form}
          name="introCaption"
          label="Caption"
          placeholder="The house, Dahilayan"
        />
      </section>

      <section className="grid gap-3">
        <SubHeading>&ldquo;The Stay&rdquo; photograph</SubHeading>
        <p className="text-xs text-admin-muted">
          The wide photograph between the heading and the four cards.
        </p>
        <ImageField
          form={form}
          name="stayImage.src"
          label="Photograph"
          businessId={businessId}
        />
        <TextField
          form={form}
          name="stayImage.alt"
          label="Describe the photograph"
          placeholder="An open living room with soft seating, sliding open to the garden"
        />
      </section>

      <section className="grid gap-3">
        <SubHeading>Full-width break</SubHeading>
        <p className="text-xs text-admin-muted">
          The full-screen photograph with one line over it, between &ldquo;The
          Stay&rdquo; and your gallery. Remove the photograph to remove the
          whole block.
        </p>
        <ImageField
          form={form}
          name="imageBreak.image"
          label="Photograph"
          businessId={businessId}
        />
        <TextField
          form={form}
          name="imageBreak.imageAlt"
          label="Describe the photograph"
          placeholder="A quiet road curving through dense pine forest, seen from above"
        />
        <StringListField
          form={form}
          name="imageBreak.titleLines"
          label="Headline"
          hint="One line per row. The last line is shown in italics."
        />
        <TextField
          form={form}
          name="imageBreak.note"
          label="Line underneath"
          placeholder="Stay a little longer."
        />
      </section>

      <section className="grid gap-3">
        <SubHeading>&ldquo;The Experience&rdquo; strip</SubHeading>
        <p className="text-xs text-admin-muted">
          The dark band after your gallery. Where &ldquo;The Stay&rdquo;
          describes what the place has, this describes what a stay feels like.
          Remove every note to remove the whole band.
        </p>
        <TextField
          form={form}
          name="experience.label"
          label="Eyebrow label"
          placeholder="The Experience"
        />
        <StringListField
          form={form}
          name="experience.titleLines"
          label="Heading"
          hint="One line per row. The last line is shown in italics."
        />
        {experience.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Note ${i + 1}`}
            onRemove={() => experience.remove(i)}
          >
            <TextField
              form={form}
              name={`experience.items.${i}.title`}
              label="Title"
              placeholder="Wake Slowly"
            />
            <TextAreaField
              form={form}
              name={`experience.items.${i}.description`}
              label="Description"
            />
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() => experience.append({ title: "", description: "" })}
        >
          Add note
        </AddButton>
      </section>

      <section className="grid gap-3">
        <SubHeading>Location panel</SubHeading>
        <p className="text-xs text-admin-muted">
          The photograph and map beside your location copy. The map itself comes
          from the pin you set under Contact details.
        </p>
        <ImageField
          form={form}
          name="location.image"
          label="Photograph"
          businessId={businessId}
        />
        <TextField
          form={form}
          name="location.imageAlt"
          label="Describe the photograph"
          placeholder="Green highland ridges with low cloud rolling over them at sunrise"
        />
        <TextField
          form={form}
          name="location.mapLabel"
          label="Map caption"
          placeholder="Dahilayan, Bukidnon"
        />
        {/* Only reached when no pin is set — with one, the template builds a
            directions link from the coordinates instead. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            form={form}
            name="location.mapCta.label"
            label="Directions button — used only if no map pin is set"
          />
          <TextField
            form={form}
            name="location.mapCta.href"
            label="Link"
          />
        </div>
      </section>

      <section className="grid gap-3">
        <SubHeading>Quotation</SubHeading>
        <p className="text-xs text-admin-muted">
          The single line before the booking section. Clear it to remove the
          block.
        </p>
        <TextAreaField
          form={form}
          name="quote.text"
          label="Quotation"
          placeholder="The best weekends are the ones you wish lasted a little longer."
        />
        <TextField
          form={form}
          name="quote.attribution"
          label="Attribution"
          placeholder="Gloria's, Dahilayan"
        />
      </section>

      <section className="grid gap-3">
        <SubHeading>Booking photograph</SubHeading>
        <p className="text-xs text-admin-muted">
          The picture behind your enquiry form. It sits under a dark wash, so a
          wide, uncluttered shot works best.
        </p>
        {/* No alt field: the picture is dimmed behind a near-opaque gradient
            and carries nothing the heading doesn't already say, so it is
            decorative and stays that way. */}
        <ImageField
          form={form}
          name="bookingImage"
          label="Photograph"
          businessId={businessId}
        />
      </section>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
