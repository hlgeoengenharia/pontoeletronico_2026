const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pptprelbbrcqrbjssoci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwdHByZWxiYnJjcXJianNzb2NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDgzNjksImV4cCI6MjA4ODMyNDM2OX0.votBbcGv7f9jpSSbBs0_GkgZ_Strm9IQxjl9oo0aPp8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  // Use a test admin user ID (replace with a real UUID if needed)
  const adminId = '00000000-0000-0000-0000-000000000000';
  const comunicado = {
    remetente_id: adminId,
    tipo: 'geral',
    subtipo: 'mensagem',
    conteudo: 'Teste de comunicado automático para validar badge Diário',
    destinatario_id: null,
    setor_id: null,
    lido: false,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('comunicados').insert([comunicado]).select('id');
  if (error) {
    console.error('Erro ao inserir comunicado:', error);
  } else {
    console.log('Comunicado inserido com ID:', data?.[0]?.id);
  }
})();
