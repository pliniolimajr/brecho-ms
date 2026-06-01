import { createClient } from '@supabase/supabase-js';

// Substitua as variáveis de ambiente após criar o projeto no Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sua-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
