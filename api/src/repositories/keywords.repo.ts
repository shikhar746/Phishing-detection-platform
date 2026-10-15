import type { KeywordRule, SuspiciousKeyword } from '@phishlens/core'
import { supabase } from '../lib/supabase.js'

// Reads and writes of `keywords`, the admin-managed list the analyzer uses.

interface KeywordRow {
  id: string
  term: string
  category: SuspiciousKeyword['category']
  weight: number
  created_at: string
}

const toKeyword = (r: KeywordRow): SuspiciousKeyword => ({
  id: r.id,
  term: r.term,
  category: r.category,
  weight: r.weight,
  createdAt: r.created_at,
})

export class DuplicateKeywordError extends Error {
  constructor() {
    super('That keyword is already on the list')
    this.name = 'DuplicateKeywordError'
  }
}

export const keywordsRepo = {
  async list(): Promise<SuspiciousKeyword[]> {
    const { data, error } = await supabase.from('keywords').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data as KeywordRow[]).map(toKeyword)
  },

  async add(rule: KeywordRule): Promise<SuspiciousKeyword> {
    const { data, error } = await supabase.from('keywords').insert(rule).select('*').single()
    if (error) {
      if (error.code === '23505') throw new DuplicateKeywordError()
      throw error
    }
    return toKeyword(data as KeywordRow)
  },

  /** Returns false when there was no such keyword. */
  async remove(id: string): Promise<boolean> {
    const { error, count } = await supabase.from('keywords').delete({ count: 'exact' }).eq('id', id)
    if (error) throw error
    return (count ?? 0) > 0
  },

  /** Inserts any of `rules` not already present; returns how many were added. */
  async seed(rules: KeywordRule[]): Promise<number> {
    const { data, error } = await supabase
      .from('keywords')
      .upsert(rules, { onConflict: 'term,category', ignoreDuplicates: true })
      .select('id')
    if (error) throw error
    return data.length
  },
}
