// Validation for what gets scanned and for admin keywords. Shared by the web
// forms and the API, so both reject exactly the same input. Each validator
// returns a message for the first problem found, or null when valid.

export const URL_MAX_LENGTH = 2048;
export const EMAIL_MIN_LENGTH = 20;
export const EMAIL_MAX_LENGTH = 20000;

/**
 * Accepts URLs with or without a scheme ("example.com/login" is fine) and
 * returns the normalized form the scanner should use.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

export function validateUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return "Enter a URL to scan.";
  if (value.length > URL_MAX_LENGTH) return "That URL is too long (max 2,048 characters).";
  if (/\s/.test(value)) return "URLs can't contain spaces.";

  const scheme = value.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && value.includes("://") && scheme !== "http" && scheme !== "https") {
    return "Only http:// and https:// links can be scanned.";
  }

  let url: URL;
  try {
    url = new URL(normalizeUrl(value));
  } catch {
    return "That doesn't look like a valid URL — try something like example.com/login.";
  }

  const host = url.hostname;
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const hasTld = /\.[a-z\d-]{2,}$/i.test(host) || host.startsWith("xn--");
  if (!isIp && !hasTld) return "Include a full domain, like example.com.";
  return null;
}

export function validateEmailContent(input: string): string | null {
  const value = input.trim();
  if (!value) return "Paste the email or message you want to analyze.";
  if (value.length < EMAIL_MIN_LENGTH) {
    return `Paste a bit more of the message (at least ${EMAIL_MIN_LENGTH} characters) for a meaningful result.`;
  }
  if (value.length > EMAIL_MAX_LENGTH) return "That message is too long (max 20,000 characters).";
  return null;
}

/** Keywords are stored trimmed and lowercase, whichever backend saves them. */
export function normalizeKeywordTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function validateKeyword(input: string, existing: string[]): string | null {
  const value = normalizeKeywordTerm(input);
  if (!value) return "Enter a keyword or phrase.";
  if (value.length < 3) return "Keywords need at least 3 characters.";
  if (value.length > 60) return "Keep keywords under 60 characters.";
  if (existing.includes(value)) return "That keyword is already on the list.";
  return null;
}
