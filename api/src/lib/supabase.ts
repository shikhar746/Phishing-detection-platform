import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

// one server-side client for the process, authenticated with the service-role
// key. There is no user session here — the API does its own auth with JWT
// cookies — so session persistence and token refresh are switched off.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
