const SUPABASE_URL = 'https://pptprelbbrcqrbjssoci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdHByZWxiYnJjcXJianNzb2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDgzNjksImV4cCI6MjA4ODMyNDM2OX0.votBbcGv7f9jpSSbBs0_GkgZ_Strm9IQxjl9oo0aPp8';

const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
};

async function check() {
    console.log("=== COMUNICADOS ===");
    const res1 = await fetch(`${SUPABASE_URL}/rest/v1/comunicados?select=*`, { headers });
    console.log(await res1.json());
    
    console.log("=== FERIADOS_FOLGAS ===");
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/feriados_folgas?select=*`, { headers });
    console.log(await res2.json());
}
check();
