# Plano de Reestruturação e Estabilidade (Interface, Diário, Escalas e Ponto)
*Documento de Arquitetura e Regras de Negócio - Sistema Ponto Eletrônico V01*

## 1. Novo Núcleo de Componentes (Cards e UI Compartilhada)
- **Tamanho de Iteração**: Padroniza botões para 44px de altura.
- **Botões e Mapa Intrusivos**: Justificativas de GPS e Fugas Geográficas terão um botão "Ver Mapa". O card se expande e exibe um widget interativo Híbrido/Satélite do Google Maps, cravado no ponto da infração.
- **Janela Universal de 24h**: O painel de "Editar/Justificar" para recados de RH e Falhas de Raio tem um *timer* que se desfaz e congela o bloco após 24 horas.

## 2. Ponto, GPS e Intervenção Analítica
- **Gestão de Perímetro ("Fora do Raio")**:
  - Se o "Período Transcorrido Fora" for rejeitado = o tempo é matematicamente subtraído do banco diário.
  - Se o *Check-in* for de Fora e Rejeitado = **Falta Direta**.
  - Se APENAS o *Check-out* for de Fora e Rejeitado = **Regra Abate 50%**.
- **Regra de Fuga/Ocultação de GPS**: Se o colaborador bloquear intencionalmente ou não tiver sinal do Geração, o sistema **permite** fisicamente a batida do ponto, mas dispara sumariamente um log acusatório vermelho pro Diário "*Bateu Ponto com GPS Oculto/Desligado*".

## 3. As 6 Leis do Relógio de Ponto (Configurações da Escala)
As 6 travas restritivas da tabela `escalas`:
1. **Janela e Tolerância (O Botão de Ponto)**: Fica cinza/morto fora do horário. No horário padrão, pulsa com bordas *neon branco celestial* e botão principal *DeepSkyBlue*. Quando ativado com o Check-in legal, fica estático em *Vermelho* exibindo um cronômetro numérico crescente das horas.
2. **Restringir por GPS**: Exige ou dispensa preenchimento obrigatório da justificativa do local.
3. **Aprovação de Exceção**: Quebras das travas acima caem direto na caixa do analista de RH.
4. **Punir Esquecimento**: Esquecer do Check-out executa de madrugada a regra de "Fechamento Artificial a 50%" da carga de horas diária.
5. **Rastreio Horário GPS ("Pulsos")**: Para jornadas externas, o celular relata silenciosamente a latitude/longitude a cada 60 min, validamente mediante o ponto estiver aberto.
6. **Interface do Almoço Cego**: Se "Intervalo" estiver ativo na escala, a visão é de Turno Contínuo (Apenas 1 Entrada e 1 Saída). O motor matemático subtrairá sorrateiramente 60 minutos do total no final.

## 4. O Sistema "Estou Ciente" para Sobrevida de Relógio
- O Painel de emissão de "*Hora Extra*" do Administrador exigirá agora a introdução de um *Limite Alocado* (em forma de minutos ou horas, ex: +1 hora permitida).
- Ao receber o Card no celular, o Funcionário clica ativamente em `ESTOU CIENTE`.
- Ao registrar a aceitação, o aplicativo quebra o selo de encerramento do relógio original e projeta a durabilidade de vida usando explicitamente o limite liberado no card.

## 5. Central de Notificações, Feriados e Assiduidade Estatística
- **O Sino Integrado (Gestores/Admins)**: O script das notificações engloba tanto os alertas do diário (`pendências/justificativas`) quanto os alertas de Férias Aguardando Aprovação na contagem do distintivo numérico do sino superior e painel central.
- **Isenção de Faltas**: "Feriados" e "Folgas" do calendário corporativo alimentam permanentemente as engrenagens de "Imunização Algorítmica", evitando falsos negativos nas estatísticas do funcionário.
