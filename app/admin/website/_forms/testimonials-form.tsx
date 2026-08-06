"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  testimonialsSchema,
  type TestimonialsFormValues,
} from "@/schemas/website-content";
import { saveTestimonials } from "@/features/website-cms/actions";
import {
  AddButton,
  Field,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  fieldClass,
  useCmsSubmit,
} from "./form-kit";

/**
 * Client testimonials. The avatar monogram isn't a field — it's derived from
 * the author's name when the site is built, so it can't fall out of step.
 */
export function TestimonialsForm({
  defaultValues,
}: {
  defaultValues: TestimonialsFormValues;
}) {
  const form = useForm<TestimonialsFormValues>({
    resolver: zodResolver(testimonialsSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveTestimonials);
  const items = useFieldArray({ control: form.control, name: "items" });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-6">
      <div className="grid gap-3">
        <SubHeading>Heading</SubHeading>
        <TextField form={form} name="heading.label" label="Eyebrow label" />
        <TextField form={form} name="heading.title" label="Title" />
        <TextField form={form} name="heading.subtitle" label="Subtitle" />
      </div>

      <div className="grid gap-3">
        <SubHeading>Testimonials</SubHeading>
        <p className="text-xs leading-relaxed text-admin-muted">
          Use real feedback from your own clients — these appear publicly with
          their name and a star rating.
        </p>
        {items.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Testimonial ${i + 1}`}
            onRemove={() => items.remove(i)}
          >
            <TextAreaField
              form={form}
              name={`items.${i}.text`}
              label="What they said"
            />
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem]">
              <TextField
                form={form}
                name={`items.${i}.author`}
                label="Client name"
              />
              <TextField
                form={form}
                name={`items.${i}.meta`}
                label="Detail (optional)"
                placeholder="Regular Client · 3 Years"
              />
              <Field
                label="Rating"
                htmlFor={`items.${i}.rating`}
                error={
                  form.formState.errors.items?.[i]?.rating?.message as
                    | string
                    | undefined
                }
              >
                <select
                  id={`items.${i}.rating`}
                  className={fieldClass}
                  // The DOM hands back a string; the schema wants a number.
                  {...form.register(`items.${i}.rating`, {
                    valueAsNumber: true,
                  })}
                >
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <option key={stars} value={stars}>
                      {"★".repeat(stars)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() =>
            items.append({ rating: 5, text: "", author: "", meta: "" })
          }
        >
          Add testimonial
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
