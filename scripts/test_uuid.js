const SUPABASE_URL = 'https://pptprelbbrcqrbjssoci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdHByZWxiYnJjcXJianNzb2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDgzNjksImV4cCI6MjA4ODMyNDM2OX0.votBbcGv7f9jpSSbBs0_GkgZ_Strm9IQxjl9oo0aPp8';

const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY };

async function debug() {
    const userId = "admin";
    const sectorId = "00000000-0000-0000-0000-000000000000";
    
    console.log("Fetching with UUID admin:");
    const url = `${SUPABASE_URL}/rest/v1/comunicados?select=id,subtipo,lido,created_at&or=(destinatario_id.eq.${userId},tipo.eq.geral,setor_id.eq.${sectorId})`;
    const res = await fetch(url, { headers });
    
    console.log("Status:", res.status);
    console.log(await res.text());
}
debug();
