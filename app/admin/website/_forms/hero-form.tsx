"use client";

import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { heroSchema, type HeroFormValues } from "@/schemas/website-content";
import { saveHero } from "@/features/website-cms/actions";
import type { TemplateFields } from "@/templates/registry";
import {
  AddButton,
  CheckField,
  NumberField,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  useCmsSubmit,
} from "./form-kit";
import { HeroVideoField } from "./hero-video-field";
import { ImageField } from "./image-field";
import { AvatarListField } from "./avatar-list-field";

export function HeroForm({
  defaultValues,
  fields,
  businessId,
}: {
  defaultValues: HeroFormValues;
  fields: TemplateFields;
  businessId: string | null;
}) {
  const form = useForm<HeroFormValues>({
    resolver: zodResolver(heroSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveHero);
  const titleLines = useFieldArray({
    control: form.control,
    name: "titleLines",
  });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-6">
      <TextField form={form} name="overline" label="Overline" />
      <TextAreaField form={form} name="description" label="Description" />

      {fields.heroScrub && (
        <HeroVideoField form={form} businessId={businessId} />
      )}

      {fields.heroPhoto && (
        <HeroPhotoFields form={form} businessId={businessId} />
      )}

      {/* A full-bleed backdrop: the picture and its description, and nothing
          else. The pill, proof strip and card above belong to a hero that sits
          BESIDE its photograph — offering them here would collect copy this
          design has nowhere to put. */}
      {fields.heroBackdrop && (
        <div className="grid gap-3">
          <SubHeading>Background photograph</SubHeading>
          <ImageField
            form={form}
            name="image"
            label="Hero photograph — fills the screen behind the heading"
            businessId={businessId}
          />
          <TextField
            form={form}
            name="imageAlt"
            label="Describe the photograph"
            placeholder="A timber and glass house glowing warmly at dusk beneath a large tree"
          />
        </div>
      )}

      <div className="grid gap-3">
        <SubHeading>Title lines</SubHeading>
        {titleLines.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Line ${i + 1}`}
            onRemove={() => titleLines.remove(i)}
          >
            <TextField form={form} name={`titleLines.${i}.text`} label="Text" />
            <CheckField
              form={form}
              name={`titleLines.${i}.stroke`}
              // The flag means "set this line apart". What that LOOKS like is
              // the template's business — a gold outline on one, an italic on
              // the other — so the label describes the intent, not the paint.
              label="Emphasise this line"
            />
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() => titleLines.append({ text: "", stroke: false })}
        >
          Add line
        </AddButton>
      </div>

      <div className="grid gap-3">
        <SubHeading>Buttons</SubHeading>
        <RepeatableRow title="Primary button">
          <TextField form={form} name="primaryCta.label" label="Label" />
          <TextField form={form} name="primaryCta.href" label="Link" />
        </RepeatableRow>
        <RepeatableRow title="Secondary button">
          <TextField form={form} name="secondaryCta.label" label="Label" />
          <TextField form={form} name="secondaryCta.href" label="Link" />
        </RepeatableRow>
      </div>

      {fields.heroStats && <StatsFields form={form} />}

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}

/**
 * The hero's figures row.
 *
 * Its own component so `useFieldArray` runs only when the section is offered —
 * see the note on about-form's EditorialFields for why that matters.
 */
function StatsFields({ form }: { form: UseFormReturn<HeroFormValues> }) {
  const stats = useFieldArray({ control: form.control, name: "stats" });

  return (
    <div className="grid gap-3">
      <SubHeading>Stats</SubHeading>
      {stats.fields.map((field, i) => (
        <RepeatableRow
          key={field.id}
          title={`Stat ${i + 1}`}
          onRemove={() => stats.remove(i)}
        >
          <TextField form={form} name={`stats.${i}.value`} label="Value" />
          <TextField form={form} name={`stats.${i}.label`} label="Label" />
        </RepeatableRow>
      ))}
      <AddButton onClick={() => stats.append({ value: "", label: "" })}>
        Add stat
      </AddButton>
    </div>
  );
}

/**
 * The still-photograph hero: the picture, the status pill, the proof strip and
 * the availability card.
 *
 * The last two are optional BLOCKS — clearing the highlight (or the card title)
 * removes the whole thing rather than publishing an empty panel, and the labels
 * say so, because "leave this blank and it disappears" is not something an
 * owner should have to discover by saving.
 */
function HeroPhotoFields({
  form,
  businessId,
}: {
  form: UseFormReturn<HeroFormValues>;
  businessId: string | null;
}) {
  return (
    <>
      <div className="grid gap-3">
        <SubHeading>Photograph</SubHeading>
        <ImageField
          form={form}
          name="image"
          label="Hero photograph"
          businessId={businessId}
        />
        <TextField
          form={form}
          name="imageAlt"
          label="Describe the photograph"
          placeholder="A naked celebration cake topped with fresh strawberries"
        />
        <TextField
          form={form}
          name="badge"
          label="Status pill (optional)"
          placeholder="Taking orders for this week"
        />
      </div>

      <div className="grid gap-3">
        <SubHeading>Proof strip</SubHeading>
        <RepeatableRow title="Reviews summary">
          <TextField
            form={form}
            name="proof.highlight"
            label="Bold part — leave blank to hide the strip"
            placeholder="4.9 average"
          />
          <TextField
            form={form}
            name="proof.text"
            label="Rest of the sentence"
            placeholder="from 380 reviews across Google and Facebook."
          />
          <NumberField
            form={form}
            name="proof.rating"
            label="Stars"
            min={1}
            max={5}
          />
          <AvatarListField form={form} name="proof.avatars" />
        </RepeatableRow>
      </div>

      <div className="grid gap-3">
        <SubHeading>Availability card</SubHeading>
        <RepeatableRow title="Card">
          <TextField
            form={form}
            name="card.title"
            label="Title — leave blank to hide the card"
            placeholder="Custom cake slots"
          />
          <TextField
            form={form}
            name="card.subtitle"
            label="Subtitle"
            placeholder="Next opening: 19 August"
          />
          <ImageField
            form={form}
            name="card.image"
            label="Thumbnail"
            businessId={businessId}
          />
          <NumberField
            form={form}
            name="card.progress"
            label="Progress bar (%)"
            min={0}
            max={100}
            hint="How full the diary is — 70 fills the bar to seven tenths."
          />
          <TextField
            form={form}
            name="card.note"
            label="Note under the bar"
            placeholder="7 of 10 August slots booked"
          />
        </RepeatableRow>
      </div>
    </>
  );
}
