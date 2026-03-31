const SUPABASE_URL = 'https://pptprelbbrcqrbjssoci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdHByZWxiYnJjcXJianNzb2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDgzNjksImV4cCI6MjA4ODMyNDM2OX0.votBbcGv7f9jpSSbBs0_GkgZ_Strm9IQxjl9oo0aPp8';

const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY };

async function debug() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/comunicados?select=*`, { headers });
    const coms = await res.json();
    console.log('Comunicados DB:', coms.length);
    if(coms.length > 0) {
        console.log('lido:', coms[0].lido, 'tipo:', coms[0].tipo);
    }
}
debug();
