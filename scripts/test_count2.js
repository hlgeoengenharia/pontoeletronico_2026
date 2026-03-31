const SUPABASE_URL = 'https://pptprelbbrcqrbjssoci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdHByZWxiYnJjcXJianNzb2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDgzNjksImV4cCI6MjA4ODMyNDM2OX0.votBbcGv7f9jpSSbBs0_GkgZ_Strm9IQxjl9oo0aPp8';

const headers = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY };

async function debugLogic() {
    // 1. Mimic user ID (Admin ID probably, using fixed UUID if needed)
    // Actually we don't know the exact UUID the admin is logged in as.
    // Let's just fetch everything to see the raw count of `geral`.
    
    // Simulate what notifications.js does
    const [resComs, resFer] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/comunicados?select=id,subtipo,lido,created_at&or=(tipo.eq.geral)`, { headers }).then(r=>r.json()),
        fetch(`${SUPABASE_URL}/rest/v1/feriados_folgas?select=id,created_at&or=(escopo.eq.geral)`, { headers }).then(r=>r.json())
    ]);

    const isShiftFinished = false;

    console.log("Coms found:", resComs.length);
    const itemsCC = resComs.filter(c => {
        // Mock config
        const isManualSeen = c.lido === true; // No localStorage in Node
        console.log(`Com[${c.id}] isManualSeen:`, isManualSeen, 'isShiftFinished:', isShiftFinished);
        return !isManualSeen && !isShiftFinished;
    });

    console.log("itemsCC counted:", itemsCC.length);

    console.log("Fers found:", resFer.length);
    const itemsCF = resFer.filter(f => {
        const isManualSeen = false; // no localStorage
        return !isManualSeen && !isShiftFinished;
    });
    console.log("itemsCF counted:", itemsCF.length);
}

debugLogic();
