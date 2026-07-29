"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { heroSchema, type HeroFormValues } from "@/schemas/website-content";
import { saveHero } from "@/features/website-cms/actions";
import {
  AddButton,
  CheckField,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  useCmsSubmit,
} from "./form-kit";
import { HeroVideoField } from "./hero-video-field";

export function HeroForm({
  defaultValues,
  businessId,
}: {
  defaultValues: HeroFormValues;
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
  const stats = useFieldArray({ control: form.control, name: "stats" });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-6">
      <TextField form={form} name="overline" label="Overline" />
      <TextAreaField form={form} name="description" label="Description" />

      <HeroVideoField form={form} businessId={businessId} />

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
              label="Gold outline (stroke)"
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

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
