import { supabase } from '../lib/supabase.js'

// All reads and writes of the `users` table go through here, so controllers
// stay free of query details and tests can swap this module for an in-memory
// fake. Not-found returns null; any other database error throws and reaches
// the error handler as a 500.

export type Role = 'user' | 'admin'

export interface PublicUser {
  id: string
  email: string
  name: string
  role: Role
}

export interface UserWithSecret extends PublicUser {
  password_hash: string | null
  google_id: string | null
}

export interface NewUser {
  email: string
  name: string
  passwordHash?: string
  googleId?: string
  imageUrl?: string | null
}

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email already registered')
    this.name = 'DuplicateEmailError'
  }
}

const PUBLIC_COLUMNS = 'id, email, name, role'
const UNIQUE_VIOLATION = '23505'

export const usersRepo = {
  async findById(id: string): Promise<PublicUser | null> {
    const { data, error } = await supabase.from('users').select(PUBLIC_COLUMNS).eq('id', id).maybeSingle()
    if (error) throw error
    return data as PublicUser | null
  },

  async findByEmail(email: string): Promise<UserWithSecret | null> {
    const { data, error } = await supabase
      .from('users')
      .select(`${PUBLIC_COLUMNS}, password_hash, google_id`)
      .eq('email', email)
      .maybeSingle()
    if (error) throw error
    return data as UserWithSecret | null
  },

  async findByGoogleId(googleId: string): Promise<PublicUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select(PUBLIC_COLUMNS)
      .eq('google_id', googleId)
      .maybeSingle()
    if (error) throw error
    return data as PublicUser | null
  },

  async create(input: NewUser): Promise<PublicUser> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: input.email,
        name: input.name,
        password_hash: input.passwordHash ?? null,
        google_id: input.googleId ?? null,
        image_url: input.imageUrl ?? null,
      })
      .select(PUBLIC_COLUMNS)
      .single()
    if (error) {
      if (error.code === UNIQUE_VIOLATION) throw new DuplicateEmailError()
      throw error
    }
    return data as PublicUser
  },

  async linkGoogle(id: string, googleId: string, imageUrl: string | null): Promise<PublicUser> {
    const { data, error } = await supabase
      .from('users')
      .update({ google_id: googleId, image_url: imageUrl })
      .eq('id', id)
      .select(PUBLIC_COLUMNS)
      .single()
    if (error) throw error
    return data as PublicUser
  },
}
