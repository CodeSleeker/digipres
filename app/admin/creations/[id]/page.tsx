import { notFound } from "next/navigation";
import { getOwnerContext } from "@/lib/tenant/business-context";
import { CreationRepository } from "@/repositories/subscriber-repository";
import { CreationForm } from "../_components/creation-form";

export const dynamic = "force-dynamic";

export default async function EditCreationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, businessId } = await getOwnerContext();
  if (!businessId) notFound();

  const creation = await new CreationRepository(supabase).findById(
    businessId,
    id,
  );
  if (!creation) notFound();

  return (
    <div className="grid gap-6">
      <h1 className="font-admin-heading text-2xl tracking-[2px]">
        Edit creation
      </h1>
      <CreationForm creation={creation} />
    </div>
  );
}
