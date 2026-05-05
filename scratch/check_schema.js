import { supabase } from './js/supabase-config.js';

async function check() {
    console.log("--- CHECKING TABLES ---");
    const { data: f } = await supabase.from('funcionarios').select('*').limit(1);
    console.log("Funcionario columns:", f ? Object.keys(f[0]) : "Empty");
    
    const { data: i } = await supabase.from('identidades_globais').select('*').limit(1);
    console.log("Identidade columns:", i ? Object.keys(i[0]) : "Empty");
    
    if (f && i) {
        console.log("Funcionario ID:", f[0].id);
        if (f[0].identidade_id) console.log("Funcionario Identity ID:", f[0].identidade_id);
    }
}

check();
