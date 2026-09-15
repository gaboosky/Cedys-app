import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zitenhgojptrnliddcoo.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppdGVuaGdvanB0cm5saWRkY29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDI4NzcsImV4cCI6MjEwNDAxODg3N30.Kau1zWBHZgT2RJfS0qKAJ469OBHFVeiXfG_we7l8Dag';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Cliente temporal, sin sesión persistente — se usa cuando el admin crea una cuenta
// para otra persona, así no se pierde la sesión propia del admin
export function crearClienteTemporal() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
