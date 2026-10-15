import { z } from 'zod'

// trim and lowercase before checking the format, so a pasted " Me@X.com "
// is accepted and stored in one canonical form
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'Enter a valid email address' }).max(254))

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long'),
  email,
  // bcrypt only reads the first 72 bytes, so longer passwords would silently
  // be truncated — reject them instead
  password: z
    .string()
    .min(8, 'Passwords are at least 8 characters')
    .max(72, 'Passwords are at most 72 characters')
    .regex(/[a-z]/i, 'Use at least one letter')
    .regex(/\d/, 'Use at least one number'),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(72),
})

// the ID token (a JWT) that Google Identity Services hands the browser
export const googleAuthSchema = z.object({
  credential: z.string().min(20, 'Missing Google credential').max(4096),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
