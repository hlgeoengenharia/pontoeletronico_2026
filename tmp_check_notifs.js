
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pptprelbbrcqrbjssoci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdHByZWxiYnJjcXJianNzb2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDgzNjksImV4cCI6MjA4ODMyNDM2OX0.votBbcGv7f9jpSSbBs0_GkgZ_Strm9IQxjl9oo0aPp8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkNotifications() {
    const userId = '1007d1a7-daf3-4ee5-ada2-2de628aa60d0'; // ID do user na screenshot
    
    console.log('--- BUSCANDO COMUNICADOS PENDENTES ---');
    const { data: user } = await supabase.from('funcionarios').select('setor_id').eq('id', userId).maybeSingle();
    const sectorId = user?.setor_id;

    console.log('User Sector ID:', sectorId);

    const { data: coms, error: errCom } = await supabase.from('comunicados')
        .select('*')
        .or(`destinatario_id.eq.${userId},tipo.eq.geral,setor_id.eq.${sectorId || '00000000-0000-0000-0000-000000000000'}`);

    if (coms) {
        console.log(`Total Comunicados encontrados: ${coms.length}`);
        coms.forEach(c => {
            console.log(`ID: ${c.id} | Tipo: ${c.tipo} | Subtipo: ${c.subtipo} | Conteudo: ${c.conteudo?.substring(0, 30)}...`);
        });
    } else {
        console.error('Erro ou nenhum comunicado:', errCom);
    }

    const { data: logs } = await supabase.from('diario_logs').select('*').eq('funcionario_id', userId).in('tipo', ['comunicado', 'aviso_ferias']).eq('status_pendencia', 'pendente');
    console.log('--- BUSCANDO LOGS PENDENTES (Diário) ---');
    if (logs) {
        console.log(`Total Logs encontrados: ${logs.length}`);
        logs.forEach(l => {
            console.log(`ID: ${l.id} | Tipo: ${l.tipo} | Descricao: ${l.descricao || l.conteudo}...`);
        });
    }

    const { data: fer } = await supabase.from('feriados_folgas').select('*').or(`funcionario_id.eq.${userId},setor_id.eq.${sectorId || '0000...'},escopo.eq.geral`);
    console.log('--- BUSCANDO FERIADOS/FOLGAS ---');
    console.log(`Total Feriados encontrados: ${fer?.length || 0}`);
}

checkNotifications();
