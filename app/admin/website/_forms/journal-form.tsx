"use client";

import { useFieldArray, useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  journalSchema,
  type JournalFormValues,
} from "@/schemas/website-content";
import { saveJournal } from "@/features/website-cms/actions";
import {
  AddButton,
  DateField,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextAreaField,
  TextField,
  useCmsSubmit,
} from "./form-kit";
import { ImageField } from "./image-field";

/** Today, as the ISO date a new entry starts on. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The journal: dated notes from the owner.
 *
 * The only section whose content is expected to CHANGE rather than be set once,
 * so the form is built to be quick — a date that defaults to today, a title, a
 * few sentences, and photographs only if there are any.
 */
export function JournalForm({
  defaultValues,
  businessId,
}: {
  defaultValues: JournalFormValues;
  businessId: string | null;
}) {
  const form = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveJournal);
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
        <SubHeading>Entries</SubHeading>
        <p className="text-xs leading-relaxed text-admin-muted">
          Short notes about what is happening — the season, a recent stay, a
          change to the place. Newest is shown first automatically, so the order
          here doesn&rsquo;t matter. Remove every entry to hide the section.
        </p>

        {items.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Entry ${i + 1}`}
            onRemove={() => items.remove(i)}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <DateField form={form} name={`items.${i}.date`} label="Date" />
              <TextField
                form={form}
                name={`items.${i}.title`}
                label="Title"
                placeholder="The first cold mornings"
              />
            </div>

            <TextAreaField
              form={form}
              name={`items.${i}.text`}
              label="What happened"
              placeholder="A few sentences is plenty."
            />

            <EntryImages form={form} index={i} businessId={businessId} />
          </RepeatableRow>
        ))}

        <AddButton
          onClick={() =>
            items.append({ date: today(), title: "", text: "", images: [] })
          }
        >
          Add entry
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}

/**
 * The photographs on ONE entry — an array inside an array.
 *
 * Its own component for a concrete reason, not tidiness: `useFieldArray` is a
 * hook, so calling it per entry inside the parent's `.map()` is not allowed,
 * and hoisting one array for all entries would make removing an entry renumber
 * the images of every entry after it. One hook per row, mounted and unmounted
 * with that row, keeps each entry's images its own.
 */
function EntryImages({
  form,
  index,
  businessId,
}: {
  form: UseFormReturn<JournalFormValues>;
  index: number;
  businessId: string | null;
}) {
  const images = useFieldArray({
    control: form.control,
    name: `items.${index}.images`,
  });

  return (
    <div className="grid gap-3 border-t border-admin-line pt-3">
      <span className="text-[0.7rem] uppercase tracking-[1.5px] text-admin-muted">
        Photographs
      </span>

      {images.fields.map((field, j) => (
        <RepeatableRow
          key={field.id}
          title={`Photo ${j + 1}`}
          onRemove={() => images.remove(j)}
        >
          <ImageField
            form={form}
            name={`items.${index}.images.${j}.src`}
            label="Photograph"
            businessId={businessId}
          />
          <TextField
            form={form}
            name={`items.${index}.images.${j}.caption`}
            label="Caption (printed under the photo)"
            placeholder="The deck, first light"
          />
          <TextField
            form={form}
            name={`items.${index}.images.${j}.alt`}
            label="Describe the photo"
            placeholder="Mist sitting in the valley below a timber deck at sunrise"
          />
        </RepeatableRow>
      ))}

      {images.fields.length < 4 && (
        <AddButton
          onClick={() => images.append({ src: "", caption: "", alt: "" })}
        >
          Add photo
        </AddButton>
      )}
    </div>
  );
}
