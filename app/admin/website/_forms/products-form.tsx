"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productsSchema,
  type ProductsFormValues,
} from "@/schemas/website-content";
import { saveProducts } from "@/features/website-cms/actions";
import {
  AddButton,
  RepeatableRow,
  SubHeading,
  SubmitBar,
  TextField,
  useCmsSubmit,
} from "./form-kit";

export function ProductsForm({
  defaultValues,
}: {
  defaultValues: ProductsFormValues;
}) {
  const form = useForm<ProductsFormValues>({
    resolver: zodResolver(productsSchema),
    defaultValues,
  });
  const { result, pending, submit } = useCmsSubmit(saveProducts);
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
        <SubHeading>Products</SubHeading>
        {items.fields.map((field, i) => (
          <RepeatableRow
            key={field.id}
            title={`Product ${i + 1}`}
            onRemove={() => items.remove(i)}
          >
            <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
              <TextField
                form={form}
                name={`items.${i}.icon`}
                label="Icon"
                placeholder="🧴"
              />
              <TextField form={form} name={`items.${i}.name`} label="Name" />
            </div>
            <TextField
              form={form}
              name={`items.${i}.description`}
              label="Description"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                form={form}
                name={`items.${i}.price`}
                label="Price"
                placeholder="₱450"
              />
              <TextField
                form={form}
                name={`items.${i}.tag`}
                label="Ribbon (optional)"
                placeholder="BEST SELLER"
              />
            </div>
          </RepeatableRow>
        ))}
        <AddButton
          onClick={() =>
            items.append({
              icon: "",
              name: "",
              description: "",
              price: "",
              tag: "",
            })
          }
        >
          Add product
        </AddButton>
      </div>

      <SubmitBar pending={pending} result={result} />
    </form>
  );
}
