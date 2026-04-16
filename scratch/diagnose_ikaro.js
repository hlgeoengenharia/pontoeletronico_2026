const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pptprelbbrcqrbjssoci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdHByZWxiYnJjcXJianNzb2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDgzNjksImV4cCI6MjA4ODMyNDM2OX0.votBbcGv7f9jpSSbBs0_GkgZ_Strm9IQxjl9oo0aPp8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnose() {
    console.log('--- Buscando Ikaro Gondim ---');
    const { data: user, error } = await supabase
        .from('funcionarios')
        .select('*, escalas!escala_id(*)')
        .ilike('nome_completo', '%Ikaro%Gondim%')
        .single();

    if (error) {
        console.error('Erro ao buscar funcionário:', error);
        return;
    }

    console.log('ID:', user.id);
    console.log('Nome:', user.nome_completo);
    console.log('Escala:', user.escalas?.nome_escala || 'Nenhuma');
    console.log('Biometria Cadastrada:', user.biometria_cadastrada);
    console.log('Token Biometria exists:', !!user.biometria_token);
    
    if (user.escalas) {
        console.log('\n--- Detalhes da Escala ---');
        console.log('Entrada:', user.escalas.horario_entrada);
        console.log('Saída:', user.escalas.horario_saida);
        console.log('Tolerância Entrada:', user.escalas.tolerancia_entrada_minutos);
        console.log('Janela Antes:', user.escalas.janela_ativa_antes_minutos);
    }

    console.log('\n--- Últimos Pontos ---');
    const { data: pontos } = await supabase
        .from('pontos')
        .select('*')
        .eq('funcionario_id', user.id)
        .order('data_hora', { ascending: false })
        .limit(5);

    pontos.forEach(p => {
        console.log(`${p.data_hora} | ${p.tipo} | ${p.status_validacao}`);
    });

    const isOnline = pontos.length > 0 && pontos[0].tipo === 'check-in';
    console.log('\nStatus Atual:', isOnline ? 'ONLINE (Aguardando Check-out)' : 'OFFLINE (Aguardando Check-in)');
}

diagnose();
