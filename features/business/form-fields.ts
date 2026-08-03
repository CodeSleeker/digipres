/**
 * The form keys the business update/create actions will accept.
 *
 * An ALLOW-LIST, so a crafted POST cannot set a column the form does not offer.
 * The cost is that a field added to the schema but forgotten here fails
 * SILENTLY: the input is dropped before Zod sees it, a partial update validates
 * fine, the save reports success, and the value never changes. That is exactly
 * how `wordmarkUrl` shipped broken — the upload reached storage, the URL never
 * reached the database, and nothing anywhere said so.
 *
 * `tests/business-form-fields.test.ts` compares this list against the schema so
 * the next one is caught here rather than by a client.
 *
 * IN ITS OWN MODULE, not in actions.ts, because that file carries "use server"
 * — and a "use server" file may only export async functions. Exporting this
 * array from there fails the BUILD, not the type check.
 */
export const FIELDS = [
  "name",
  "slug",
  "description",
  "phone",
  "email",
  "notifyEmail",
  "notifyPhone",
  "notifyCustomerSms",
  "address",
  "addressLocality",
  "addressRegion",
  "addressPostalCode",
  "addressCountry",
  "logoUrl",
  "wordmarkUrl",
  "faviconUrl",
  "coverImageUrl",
  "category",
  "ownerName",
  "googleReviewUrl",
  "facebookUrl",
  "instagramUrl",
  "tiktokUrl",
  "websiteUrl",
] as const;
