import Link from "next/link";
import { CustomerForm } from "../_components/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/customers"
          className="text-xs text-admin-muted transition-colors hover:text-admin-accent"
        >
          ← Back to customers
        </Link>
        <h1 className="mt-2 font-admin-heading text-2xl tracking-[2px]">
          New Customer
        </h1>
      </div>
      <CustomerForm mode="create" />
    </div>
  );
}
