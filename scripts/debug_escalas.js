// Debug: Check what fields exist in escalas table
import { supabase } from '../js/supabase-config.js';

async function checkEscalasSchema() {
  const { data, error } = await supabase.from('escalas').select('*').limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Fields in escalas table:');
  console.log(Object.keys(data[0] || {}));
}

checkEscalasSchema();