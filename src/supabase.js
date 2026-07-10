import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Demo mode: no backend configured — App runs on in-memory seed data.
export const hasBackend = !!(url && anonKey)

export const supabase = hasBackend ? createClient(url, anonKey) : null

// Stable per-browser voter key for anonymous voting.
// Logged-in users vote with their user id instead.
export function getVoterKey() {
  let key = localStorage.getItem('pcb_voter_key')
  if (!key) {
    key = crypto.randomUUID()
    localStorage.setItem('pcb_voter_key', key)
  }
  return key
}
