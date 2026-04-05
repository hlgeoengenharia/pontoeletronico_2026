const SUPABASE_URL = 'https://pptprelbbrcqrbjssoci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdHByZWxiYnJjcXJianNzb2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDgzNjksImV4cCI6MjA4ODMyNDM2OX0.votBbcGv7f9jpSSbBs0_GkgZ_Strm9IQxjl9oo0aPp8';

const tables = [
    'pontos',
    'diario_logs',
    'justificativas',
    'ferias',
    'comunicados',
    'feriados_folgas'
];

async function purgeAll() {
    console.log('--- INICIANDO PURGA DE DADOS DO PROJETO V01 ---');
    
    for (const table of tables) {
        try {
            console.log(`Limpando tabela: ${table}...`);
            // Usamos DELETE com uma condição que sempre é verdadeira (id is not null) 
            // ou sem condição se o Supabase permitir.
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`, {
                method: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            });

            if (response.ok) {
                console.log(`✅ Tabela ${table} limpa com sucesso.`);
            } else {
                const err = await response.text();
                console.warn(`⚠️ Falha ao limpar ${table}: ${response.status} - ${err}`);
                console.log('Tentando sem parâmetro de ID...');
                
                // Segunda tentativa sem query param (algumas confs do Supabase exigem)
                const res2 = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                });
                if (res2.ok) console.log(`✅ Tabela ${table} limpa na segunda tentativa.`);
                else console.error(`❌ Erro final em ${table}: ${res2.status}`);
            }
        } catch (e) {
            console.error(`💥 Erro crítico ao processar ${table}:`, e.message);
        }
    }
    
    console.log('--- PROCESSO DE LIMPEZA CONCLUÍDO ---');
}

purgeAll();
