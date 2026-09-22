"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  enquirySectionSchema,
  type EnquiryFormValues,
} from "@/schemas/website-content";
import { saveEnquirySection } from "@/features/website-cms/actions";
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
 * What the enquiry form asks, and what it says afterwards.
 *
 * Its own menu since migration 0044. It used to sit inside the one called
 * "Events", underneath the portfolio cards and the event grid \u2014 so an owner
 * changing the questions on their form had to look under a heading about
 * their photographs.
 *
 * Enquiries arrive under Enquiries in the back office, and the person who
 * sent one gets an emailed receipt and a text.
 */
export function EnquiryForm({
  defaultValues,
}: {
  defaultValues: EnquiryFormValues;
}) {
  const form = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquirySectionSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveEnquirySection);
  const eventTypes = useFieldArray({
    control: form.control,
    name: "eventTypes",
  });
  const budgets = useFieldArray({
    control: form.control,
    name: "budgetRanges",
  });
  const serviceNeeds = useFieldArray({
    control: form.control,
    name: "serviceNeeds",
  });

  return (
    <form onSubmit={form.handleSubmit(submit)} className="grid max-w-2xl gap-8">
      <p className="text-xs leading-relaxed text-admin-muted">
        The three dropdowns are yours to set. Only list what you actually take
        on \u2014 an option here is a question you are promising to answer.
      </p>

      <section className="grid gap-3">
        <TextField
          form={form}
          name="title"
          label="Form heading"
          placeholder="Tell us about your celebration"
          hint="The last word is shown in gold italics."
        />
        <TextAreaField form={form} name="intro" label="Intro text" />
      </section>

      <section className="grid gap-3">
        <SubHeading>Kinds of event</SubHeading>
        {eventTypes.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Option ${i + 1}`}
            onRemove={() => eventTypes.remove(i)}
          >
            <TextField
              form={form}
              name={`eventTypes.${i}.label`}
              label="Label"
              placeholder="Wedding"
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => eventTypes.append({ label: "" })}>
          Add kind of event
        </AddButton>
      </section>

      <section className="grid gap-3">
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
              name={`budgetRanges.${i}.label`}
              label="Label"
              placeholder="\u20b1100,000 \u2013 \u20b1250,000"
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => budgets.append({ label: "" })}>
          Add band
        </AddButton>
      </section>

      <section className="grid gap-3">
        <SubHeading>Services they can tick</SubHeading>
        {serviceNeeds.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Service ${i + 1}`}
            onRemove={() => serviceNeeds.remove(i)}
          >
            <TextField
              form={form}
              name={`serviceNeeds.${i}.label`}
              label="Label"
              placeholder="Florals and d\u00e9cor"
            />
          </RepeatableRow>
        ))}
        <AddButton onClick={() => serviceNeeds.append({ label: "" })}>
          Add service
        </AddButton>
      </section>

      <section className="grid gap-3">
        <SubHeading>After they press send</SubHeading>
        <TextField
          form={form}
          name="successTitle"
          label="Heading"
          placeholder="Your enquiry is with us"
        />
        <TextAreaField
          form={form}
          name="successText"
          label="What happens next"
          hint="They are also shown a reference code, which appears beside the enquiry in your inbox."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            form={form}
            name="messengerCta.label"
            label="Messenger button"
            placeholder="Continue on Messenger"
            hint="Leave blank for no button."
          />
          <TextField
            form={form}
            name="messengerCta.href"
            label="Messenger link"
            placeholder="https://m.me/yourpage"
          />
        </div>
      </section>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
