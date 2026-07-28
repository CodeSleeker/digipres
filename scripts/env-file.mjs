import { readFileSync } from "node:fs";

/**
 * Minimal .env file parser for plain-Node scripts (seed, smoke) that run
 * outside Next.js and therefore don't get its env loading.
 *
 * Mirrors the precedence that matters: values already present in `process.env`
 * WIN over the file, so `SEED_ADMIN_EMAIL=x npm run seed` behaves as expected.
 * Supports comments, blank lines, `export ` prefixes, and single/double quotes.
 *
 * @param {string} contents
 * @returns {Record<string, string>}
 */
export function parseEnvFile(contents) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = /^(?:export\s+)?([\w.]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    let value = match[2].trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    } else {
      // Unquoted values may carry a trailing comment.
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trim();
    }
    out[match[1]] = value;
  }
  return out;
}

/**
 * Load `path` into process.env without overriding existing variables.
 * @param {string} path
 * @returns {Record<string, string>}
 */
export function loadEnvFile(path) {
  let contents;
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    return {}; // no file — rely on the real environment
  }
  const parsed = parseEnvFile(contents);
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return parsed;
}
