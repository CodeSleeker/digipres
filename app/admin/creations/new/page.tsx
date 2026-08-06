import { CreationForm } from "../_components/creation-form";

export default function NewCreationPage() {
  return (
    <div className="grid gap-6">
      <h1 className="font-admin-heading text-2xl tracking-[2px]">
        Add something new
      </h1>
      <CreationForm />
    </div>
  );
}
