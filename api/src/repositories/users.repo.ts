import type { AdminUser, Role } from '@phishlens/core'
import { supabase } from '../lib/supabase.js'

// All reads and writes of the `users` table go through here, so controllers
// stay free of query details and tests can swap this module for an in-memory
// fake. Not-found returns null; any other database error throws and reaches
// the error handler as a 500.

export type UserStatus = AdminUser['status']

/** The account as the API returns it; never includes credentials. */
export interface PublicUser {
  id: string
  email: string
  name: string
  role: Role
  status: UserStatus
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

// undefined fields are left unchanged (JSON serialization drops them)
export type UserPatch = { role?: Role | undefined; status?: UserStatus | undefined }

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email already registered')
    this.name = 'DuplicateEmailError'
  }
}

const PUBLIC_COLUMNS = 'id, email, name, role, status'
const UNIQUE_VIOLATION = '23505'

interface OverviewRow {
  id: string
  email: string
  name: string
  role: Role
  status: UserStatus
  created_at: string
  scans: number
  last_active: string
}

const toAdminUser = (r: OverviewRow): AdminUser => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  status: r.status,
  scans: r.scans,
  lastActive: r.last_active,
  createdAt: r.created_at,
})

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

  /** Every account with its scan count and last activity, newest first. */
  async listOverview(): Promise<AdminUser[]> {
    const { data, error } = await supabase
      .from('admin_user_overview')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as OverviewRow[]).map(toAdminUser)
  },

  async update(id: string, patch: UserPatch): Promise<AdminUser | null> {
    const { error, count } = await supabase.from('users').update(patch, { count: 'exact' }).eq('id', id)
    if (error) throw error
    if (!count) return null
    const { data, error: readError } = await supabase.from('admin_user_overview').select('*').eq('id', id).single()
    if (readError) throw readError
    return toAdminUser(data as OverviewRow)
  },

  async counts(): Promise<{ total: number; active: number }> {
    const [all, active] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ])
    if (all.error) throw all.error
    if (active.error) throw active.error
    return { total: all.count ?? 0, active: active.count ?? 0 }
  },
}
