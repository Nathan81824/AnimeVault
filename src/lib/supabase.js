
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase configuration is missing. Check your .env file.'
  )
}

if (!supabaseUrl.startsWith('https://')) {
  throw new Error(
    'Invalid Supabase URL. It must start with https://'
  )
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
)

console.log('SUPABASE PROJECT CHECK:', {
  url: supabaseUrl,
  hasPublishableKey: Boolean(supabasePublishableKey),
})
