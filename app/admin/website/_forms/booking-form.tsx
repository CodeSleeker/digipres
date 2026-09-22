"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  bookingSectionSchema,
  type BookingFormValues,
} from "@/schemas/website-content";
import { saveBookingSection } from "@/features/website-cms/actions";
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
 * Booking a consultation \u2014 the other half of the same form on the page.
 *
 * CLEARING THE HEADING TURNS IT OFF. With it, the enquiry section becomes two
 * modes and a visitor can pick a day and a time; without it the page takes
 * enquiries only, which is right for a studio that quotes after a
 * conversation. The template checks the same field, so the two agree.
 *
 * A consultation becomes a real appointment in your calendar. An enquiry does
 * not \u2014 it has no date, and filing one as the other would put a question in
 * the diary and text the person for a review of something that never
 * happened.
 */
export function BookingForm({
  defaultValues,
}: {
  defaultValues: BookingFormValues;
}) {
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSectionSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveBookingSection);
  const topics = useFieldArray({ control: form.control, name: "topics" });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-8">
      <p className="text-xs leading-relaxed text-admin-muted">
        Adds a second choice to your enquiry form: one for questions about an
        event, one for booking a time to talk. A consultation goes in your
        appointments; an enquiry does not.
      </p>

      <section className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            form={form}
            name="enquiryLabel"
            label="First option"
            placeholder="About an event"
          />
          <TextField
            form={form}
            name="bookingLabel"
            label="Second option"
            placeholder="Book a consultation"
          />
        </div>
        <TextField
          form={form}
          name="title"
          label="Heading"
          placeholder="Let's find a time to talk"
          hint="Clearing this removes the choice entirely and leaves the enquiry form on its own. The last word is shown in gold italics."
        />
        <TextAreaField form={form} name="intro" label="Intro text" />
      </section>

      <section className="grid gap-3">
        <SubHeading>What a consultation is about</SubHeading>
        {topics.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Topic ${i + 1}`}
            onRemove={() => topics.remove(i)}
          >
            <TextField
              form={form}
              name={`topics.${i}.label`}
              label="Label"
              placeholder="Wedding"
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => topics.append({ label: "" })}>
          Add topic
        </AddButton>
      </section>

      <section className="grid gap-3">
        <SubHeading>After they request a slot</SubHeading>
        <TextField
          form={form}
          name="successTitle"
          label="Heading"
          placeholder="Your slot is requested"
        />
        <TextAreaField
          form={form}
          name="successText"
          label="What happens next"
          hint="Say that you will confirm \u2014 nothing is booked in until you do."
        />
      </section>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
