// Configurações do Supabase - Projeto V01
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://pptprelbbrcqrbjssoci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdHByZWxiYnJjcXJianNzb2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDgzNjksImV4cCI6MjA4ODMyNDM2OX0.votBbcGv7f9jpSSbBs0_GkgZ_Strm9IQxjl9oo0aPp8';

// Cliente oficial do Supabase (usa a anon key internamente para chamadas via fetch)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar a chave e um helper para uso em fetches diretos quando necessário.
// Observação: o erro CORS é resolvido no painel do Supabase (Settings → API → Allowed request origins).
function getAuthHeaders() {
	return {
		apikey: SUPABASE_ANON_KEY,
		Authorization: `Bearer ${SUPABASE_ANON_KEY}`
	};
}

export { supabase, SUPABASE_ANON_KEY, getAuthHeaders };
