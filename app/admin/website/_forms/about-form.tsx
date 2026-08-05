"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { aboutSchema, type AboutFormValues } from "@/schemas/website-content";
import { saveAbout } from "@/features/website-cms/actions";
import {
  RepeatableRow,
  StringListField,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  useCmsSubmit,
} from "./form-kit";
import { ImageField } from "./image-field";

export function AboutForm({
  defaultValues,
  businessId,
}: {
  defaultValues: AboutFormValues;
  businessId: string | null;
}) {
  const form = useForm<AboutFormValues>({
    resolver: zodResolver(aboutSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveAbout);

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-6">
      <TextField form={form} name="label" label="Eyebrow label" />
      <TextAreaField form={form} name="text" label="Body text" />
      <ImageField
        form={form}
        name="image"
        label="Image"
        businessId={businessId}
      />
      <TextField
        form={form}
        name="imageAlt"
        label="Describe the image (optional)"
        placeholder="The shop floor with three barber chairs and a client mid-cut"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField form={form} name="badgeValue" label="Badge value" />
        <TextField form={form} name="badgeLabel" label="Badge label" />
      </div>

      <StringListField
        form={form}
        name="titleLines"
        label="Title lines"
        hint="One line per row."
      />
      <StringListField
        form={form}
        name="features"
        label="Features"
        hint="One feature per row."
      />

      <div className="grid gap-3">
        <SubHeading>Button</SubHeading>
        <RepeatableRow title="Call to action">
          <TextField form={form} name="cta.label" label="Label" />
          <TextField form={form} name="cta.href" label="Link" />
        </RepeatableRow>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
