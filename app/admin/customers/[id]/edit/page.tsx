import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/features/customers/queries";
import { CustomerForm } from "../../_components/customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/customers"
          className="text-xs text-gray transition-colors hover:text-gold"
        >
          ← Back to customers
        </Link>
        <h1 className="mt-2 font-heading text-2xl tracking-[2px]">
          Edit Customer
        </h1>
      </div>
      <CustomerForm mode="edit" customer={customer} />
    </div>
  );
}
