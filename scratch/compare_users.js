const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = process.env.SUPABASE_URL || 'https://vstmvixlrvogmclghitw.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function compare() {
    const { data: users, error } = await supabase
        .from('funcionarios')
        .select('*, escalas!escala_id(*), setores!funcionarios_setor_id_fkey(*)')
        .or('nome_completo.ilike.%Helton%,nome_completo.ilike.%Ikaro%');

    if (error) {
        console.error(error);
        return;
    }

    console.log(JSON.stringify(users, null, 2));
}

compare();
