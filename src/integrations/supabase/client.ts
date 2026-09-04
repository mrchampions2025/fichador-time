import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}


const DEFAULT_SUPABASE_URL = "https://vprixytfssnbdvbaqrlr.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_zZSh4oWMKQgIsyMorKzVMA_7pMcYyCF";

function createSupabaseClient() {
  const env = import.meta.env || {};
  const procEnv = (typeof process !== 'undefined' && process.env) || {};

  const SUPABASE_URL =
    env['VITE_SUPABASE_URL'] ||
    env['NEXT_PUBLIC_SUPABASE_URL'] ||
    env['SUPABASE_URL'] ||
    procEnv['VITE_SUPABASE_URL'] ||
    procEnv['SUPABASE_URL'] ||
    procEnv['NEXT_PUBLIC_SUPABASE_URL'] ||
    DEFAULT_SUPABASE_URL;

  const SUPABASE_PUBLISHABLE_KEY =
    env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    env['VITE_SUPABASE_ANON_KEY'] ||
    env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    env['SUPABASE_ANON_KEY'] ||
    env['SUPABASE_PUBLISHABLE_KEY'] ||
    procEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    procEnv['VITE_SUPABASE_ANON_KEY'] ||
    procEnv['SUPABASE_PUBLISHABLE_KEY'] ||
    procEnv['SUPABASE_ANON_KEY'] ||
    procEnv['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    DEFAULT_SUPABASE_KEY;


  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

