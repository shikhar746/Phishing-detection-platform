// Validation for the auth forms. Returns a message string for the first
// problem found, or null when the value is valid. Scan-input and keyword
// validation is shared with the API and lives in @phishlens/core.

export function validateEmailAddress(input: string): string | null {
  const value = input.trim();
  if (!value) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(input: string, { strict = false } = {}): string | null {
  if (!input) return "Enter your password.";
  if (input.length < 8) return "Passwords are at least 8 characters.";
  if (strict && (!/[a-z]/i.test(input) || !/\d/.test(input))) {
    return "Use at least one letter and one number.";
  }
  return null;
}

export function validateName(input: string): string | null {
  const value = input.trim();
  if (!value) return "Enter your name.";
  if (value.length < 2) return "Name is too short.";
  if (value.length > 80) return "Name is too long.";
  return null;
}
