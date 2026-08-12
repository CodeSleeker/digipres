/**
 * A "message us" destination derived from the tenant's Facebook page.
 *
 * WHY NOT A MESSENGER NOTIFICATION TO THE OWNER.
 *
 * Meta's Messenger Platform can only send to someone who has messaged the Page
 * — the 24-hour standard messaging window opens when THEY write first, click a
 * call-to-action, or follow an m.me link. An owner is not a customer of their
 * own Page, so there is no recipient id to send to and no open window, and the
 * send would need `pages_messaging` with app review besides.
 *
 * What does work is the other direction, which is what this builds: the visitor
 * follows an m.me link and writes to the Page, which opens the window and makes
 * Facebook itself notify the owner on their phone. The owner gets a Messenger
 * message about the enquiry; it just arrives from the visitor rather than from
 * us.
 *
 * `m.me/<name>` opens the conversation directly — in the Messenger app on a
 * phone. It is only derivable from a vanity URL: a numeric `profile.php?id=`
 * link has no username to use, so that falls back to the page itself, which
 * still has a Message button on it.
 */
export function messengerLink(facebookUrl: string | undefined): string | null {
  if (!facebookUrl) return null;

  let url: URL;
  try {
    url = new URL(facebookUrl);
  } catch {
    return null;
  }

  if (!/(^|\.)facebook\.com$|(^|\.)fb\.com$/i.test(url.hostname)) {
    // Not a Facebook link at all — nothing to derive, and guessing would send
    // visitors somewhere the owner never nominated.
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const username = segments[0];

  // A vanity name only: `profile.php`, `pages/...` and `people/...` all carry a
  // numeric id that m.me cannot open.
  if (
    segments.length === 1 &&
    username &&
    /^[A-Za-z0-9.]{3,50}$/.test(username) &&
    !username.includes(".php")
  ) {
    return `https://m.me/${username}`;
  }

  return facebookUrl;
}
