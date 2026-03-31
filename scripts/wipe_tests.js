const SUPABASE_URL = 'https://pptprelbbrcqrbjssoci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdHByZWxiYnJjcXJianNzb2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDgzNjksImV4cCI6MjA4ODMyNDM2OX0.votBbcGv7f9jpSSbBs0_GkgZ_Strm9IQxjl9oo0aPp8';

const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
};

async function wipeDatabase() {
    console.log('🔥 Iniciando limpeza extrema de tabelas...');
    const tables = ['comunicados', 'feriados_folgas', 'diario_logs', 'anotacoes', 'justificativas', 'ferias', 'pontos'];
    
    for (const table of tables) {
        process.stdout.write(`Deletando todos os registros de ${table}... `);
        
        let res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, { method: 'DELETE', headers });
        if (!res.ok) {
            // Some tables might have different PK types
            res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=gt.0`, { method: 'DELETE', headers });
        }
        
        if (!res.ok) {
            console.log(`❌ Erro: ${await res.text()}`);
        } else {
            console.log('✅ OK');
        }
    }
    console.log("🎉 BD Limpo.");
}

wipeDatabase();
