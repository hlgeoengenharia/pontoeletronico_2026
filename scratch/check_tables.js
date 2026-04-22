
import { supabase } from '../js/supabase-config.js';

async function testTables() {
    console.log('Testing tables...');
    
    const { data: aData, error: aError } = await supabase.from('anotacoes').select('count', { count: 'exact', head: true }).limit(1);
    console.log('anotacoes:', { exists: !aError, count: aData, error: aError?.message });

    const { data: adData, error: adError } = await supabase.from('anotacoes_diaria').select('count', { count: 'exact', head: true }).limit(1);
    console.log('anotacoes_diaria:', { exists: !adError, count: adData, error: adError?.message });
}

testTables();
