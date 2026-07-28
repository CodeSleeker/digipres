/**
 * Renders a JSON-LD `<script>`. The object is built server-side by us, and we
 * escape `<` so a value can never break out of the script tag (`</script>`).
 * This is the one sanctioned use of dangerouslySetInnerHTML here.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
