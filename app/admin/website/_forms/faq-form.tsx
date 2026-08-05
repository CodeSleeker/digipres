"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { faqSchema, type FaqFormValues } from "@/schemas/website-content";
import { saveFaq } from "@/features/website-cms/actions";
import {
  AddButton,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  useCmsSubmit,
} from "./form-kit";

/**
 * Frequently asked questions.
 *
 * The only section form where saving with no rows is valid: an empty list
 * removes the section from the live site and withdraws its FAQPage markup,
 * which is the only way an owner can take one down once published.
 */
export function FaqForm({ defaultValues }: { defaultValues: FaqFormValues }) {
  const form = useForm<FaqFormValues>({
    resolver: zodResolver(faqSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveFaq);
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
        <SubHeading>Questions</SubHeading>
        <p className="text-xs leading-relaxed text-gray">
          Answer what customers actually ask before booking — parking, walk-ins,
          payment, how long a service takes, what to bring. Write each answer so
          it makes sense on its own: search engines and AI assistants quote
          these directly, without the question around them.
        </p>
        <p className="text-xs leading-relaxed text-gray">
          Leave this empty and the FAQ section is hidden from your website.
        </p>
        {items.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Question ${i + 1}`}
            onRemove={() => items.remove(i)}
          >
            <TextField
              form={form}
              name={`items.${i}.question`}
              label="Question"
              placeholder="Do I need an appointment?"
            />
            <TextAreaField
              form={form}
              name={`items.${i}.answer`}
              label="Answer"
              placeholder="Walk-ins are welcome, but booking ahead guarantees your slot — especially on weekends."
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => items.append({ question: "", answer: "" })}>
          Add question
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
