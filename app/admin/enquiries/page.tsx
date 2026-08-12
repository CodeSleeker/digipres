import { getEnquiries } from "@/features/enquiries/queries";
import { contactLine } from "@/lib/website/contact-line";
import type { Enquiry } from "@/types/enquiry";
import { EnquiryActions } from "./_components/enquiry-actions";

export const metadata = { title: "Enquiries" };

/**
 * The enquiry inbox — questions asked through the tenant's website.
 *
 * A list rather than a list-plus-detail: an enquiry is a name, a way to reply
 * and a few sentences, all of which fit on one row. A detail route would be a
 * second click to see something already on screen.
 */
export default async function EnquiriesPage() {
  const enquiries = await getEnquiries();
  const unread = enquiries.filter((e) => !e.readAt).length;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-admin-heading text-2xl tracking-[2px]">
          Enquiries
        </h1>
        {unread > 0 && (
          <span className="text-xs text-admin-muted">
            {unread} unread of {enquiries.length}
          </span>
        )}
      </div>

      <p className="max-w-2xl text-xs leading-relaxed text-admin-muted">
        Questions people asked through your website — about what you offer,
        how to get there, anything that isn&rsquo;t a booking. Replying happens
        in your own email or phone; this is the record that they asked.
      </p>

      {enquiries.length === 0 ? (
        <div className="border border-admin-line p-8 text-center text-sm text-admin-muted">
          No enquiries yet. They&rsquo;ll appear here the moment someone sends
          one, and you&rsquo;ll get a text and an email as well.
        </div>
      ) : (
        <ul className="grid gap-3">
          {enquiries.map((enquiry) => (
            <EnquiryCard key={enquiry.id} enquiry={enquiry} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EnquiryCard({ enquiry }: { enquiry: Enquiry }) {
  const unread = !enquiry.readAt;

  return (
    <li
      className={[
        "border p-4 transition-colors",
        unread
          ? "border-admin-accent/50 bg-admin-accent-wash"
          : "border-admin-line",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-admin-fg">
            <span className="font-medium">{enquiry.name}</span>
            {unread && (
              <span className="rounded-none border border-admin-accent px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[1.5px] text-admin-accent">
                New
              </span>
            )}
            {enquiry.topic && (
              <span className="text-xs text-admin-muted">{enquiry.topic}</span>
            )}
          </p>

          {/* The reply routes, as links — the whole action this page prompts.
              Same classification the public templates use, so a number is
              diallable and an address opens a compose window. */}
          <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-admin-muted">
            {[enquiry.email, enquiry.phone]
              .filter((v): v is string => Boolean(v))
              .map((value) => {
                const { href } = contactLine(value);
                return href ? (
                  <a
                    key={value}
                    href={href}
                    className="transition-colors hover:text-admin-accent"
                  >
                    {value}
                  </a>
                ) : (
                  <span key={value}>{value}</span>
                );
              })}
          </p>
        </div>

        <time
          dateTime={enquiry.createdAt}
          className="shrink-0 text-xs text-admin-muted"
        >
          {enquiry.createdAt.slice(0, 10)}
        </time>
      </div>

      {/* `whitespace-pre-line` so the paragraphs someone typed survive. */}
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-admin-fg/80">
        {enquiry.message}
      </p>

      <EnquiryActions id={enquiry.id} unread={unread} />
    </li>
  );
}
