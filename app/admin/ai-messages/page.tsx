import { guardPage } from "@/lib/features/guard";
import { getMyBusiness } from "@/features/business/actions";
import { SmsGenerator } from "./_components/sms-generator";

/**
 * AI SMS message generator. Prefills business/owner details from the tenant's
 * business so the owner just adds the customer + service and generates.
 */
export default async function AiMessagesPage() {
  await guardPage("ai_messages");
  const business = await getMyBusiness();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-heading text-2xl tracking-[2px]">
          AI Message Generator
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray">
          Generate natural, non-spammy SMS variations that greet the customer,
          mention the owner by name, and stay under {320} characters. Without an
          AI provider configured, on-brand templates are used instead.
        </p>
      </div>
      <SmsGenerator
        defaults={{
          businessType: business?.category ?? "",
          ownerName: business?.ownerName ?? "",
          businessName: business?.name ?? "",
        }}
      />
    </div>
  );
}
