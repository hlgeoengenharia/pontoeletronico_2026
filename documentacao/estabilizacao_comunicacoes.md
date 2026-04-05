# 🛡️ Blindagem: Ecossistema de Notificações ChronoSync

Este documento registra o estado de perfeição técnica alcançado nas comunicações e badges, servindo como guia de proteção para as próximas atualizações.

## 🏛️ Arquitetura Singleton (Instância Única)

Para evitar os erros de "conflito de realtime" e subscrições duplicadas, consolidamos uma arquitetura de motor único:

- **notifications.js**: O motor de busca e contagem. Ele é o único responsável por consultar o Supabase e atualizar os selos numéricos (badges) na interface.
- **Não versionar URLs**: As importações agora são limpas (`import { Notifications } from '../js/notifications.js'`), garantindo que o navegador nunca carregue duas instâncias do mesmo script.

---

## 🎨 Lógica de Agrupamento e Fidelidade

Resolvemos a inflação de notificações com o **Agrupamento por Lote**:
- **Regra:** Não importa quantos dias um feriado ou folga contenha, o badge contará apenas **1 evento**.
- **Filtro:** A contagem agora utiliza o `created_at` como chave de lote, unificando a experiência informativa.

---

## 💎 Limpeza Atômica e Recursiva

O "Efeito Bumerangue" (o contador voltar ao Dashboard) foi erradicado com a sincronização total:
- **Diário de Bordo**: Ao carregar, o sistema agora busca **Comunicados, Feriados e Logs Operacionais**.
- **Limpeza Recursiva**: A função `clearAutoInformativos` percorre cada ID individual de um lote de feriado e os marca como **Visto** simultaneamente no `LocalStorage` e no **Supabase**.
- **Zerar Badge**: O Dashboard só limpa o badge se o banco de dados confirmar que não há registros pendentes.

---

## 🚦 Regras de Ouro para Próximas Etapas

Para garantir que o **Registro de Ponto** e o **GPS** não afetem as notificações:
1. **Não tocar na função `updateBadges()`**: Toda a lógica de contagem está isolada e protegida.
2. **Respeitar o `EventManager`**: Ele é o maestro que unifica o histórico. Qualquer nova atividade (como batida de ponto) deve passar pelo seu renderizador.
3. **Preservar `ItemType`**: Esse rótulo é a chave que permite a limpeza automática de alertas.

> [!TIP]
> **Estado de Proteção:** Atualmente o sistema de notificações está **CONGELADO E ESTÁVEL**. Qualquer alteração futura que impacte a `diario_logs` ou `justificativas` deve ser testada contra este documento.

---
*Gerado em 04/04/2026 para fins de governança de jornada.*
