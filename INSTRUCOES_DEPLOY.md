# 🚀 Manual de Deploy - Pontoeletronico 2026

Este guia contém o passo a passo padrão para subir suas atualizações com segurança utilizando GitHub e Vercel.

## 1. Verificação Pré-vôo (Local)
Sempre teste as alterações no seu servidor local antes de subir.
*   Servidor: `python -m http.server 8080`
*   Acesse: `http://localhost:8080`
*   Dica: Use o Inspetor do Navegador (F12) para testar o layout em modo celular.

## 2. Preparando o Envio (Git)
Abra o terminal na pasta do projeto e execute os seguintes comandos em ordem:

```bash
# Passo 1: Capturar todas as alterações
git add .

# Passo 2: Carimbar a versão com uma mensagem do que foi feito
# Altere o texto entre aspas para descrever sua atualização
git commit -m "feat: descrição das melhorias realizadas"

# Passo 3: Enviar para o GitHub
git push origin main
```

## 3. Finalização (Vercel)
Após o `git push`, a Vercel detecta a mudança automaticamente.
1.  Acesse seu painel na [Vercel](https://vercel.com/).
2.  Acompanhe o status em **"Deployments"**.
3.  Quando ficar verde (**Ready**), o site está atualizado.

## 4. Dicas de Ouro do Camisa 10
*   **Cache:** Se o site abrir a versão antiga no celular, use uma aba anônima ou limpe o cache do navegador.
*   **Mensagens de Commit:** Tente ser específico (ex: "ajuste no botão de fechar" em vez de "ajuste"). Isso ajuda muito a organizar o histórico do seu projeto.
*   **Erros de Conflito:** Se o `git push` falhar por "conflito", significa que há arquivos no GitHub que você não tem localmente. Use `git pull origin main` antes de tentar o push novamente.

---
*Manual criado por seu assistente Antigravity - 2026*
