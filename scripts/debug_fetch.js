const fs = require('fs');

async function debugLogic() {
    // Fake the items
    const coms = [
      {
        id: 'cd329488-c417-46ea-a2ab-d2a2b8d39e20',
        tipo: 'geral', subtipo: 'mensagem',
        lido: false, created_at: '2026-03-31T01:42:40.666612+00:00'
      }
    ];
    
    // Simulate what diario_funcionario does for grouping
    const offset = 3 * 60000; // Fake timezone offset for UTC-03:00? No, getTimezoneOffset returns positive 180 for Brazil
    const now = new Date('2026-03-31T01:45:00.000Z'); // Assuming current UTC time
    const tzOffset = 180 * 60000; 
    const todayDateStr = new Date(now.getTime() - tzOffset).toISOString().split('T')[0];
    
    console.log("Diario_Funcionario 'todayDateStr':", todayDateStr);
    console.log("Comunicado data_item:", coms[0].created_at.split('T')[0]);
    console.log("Match?", todayDateStr === coms[0].created_at.split('T')[0]);
}
debugLogic();
