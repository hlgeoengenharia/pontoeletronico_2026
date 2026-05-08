@echo off
set SRC=C:\Users\Windows 11\.gemini\antigravity\brain\f69d71a8-de3e-4c45-9733-ca2a61c0a736
set DEST=c:\Users\Windows 11\Documents\Projetos\Projeto_V01\pontoeletronico_2026\screenshots

echo ==========================================
echo    CHRONOSYNC - COLETOR DE PRINTS
echo ==========================================

echo [1/2] Copiando imagens reais...
copy "%SRC%\helton_dashboard_*.png" "%DEST%\helton_dashboard.png" /Y
copy "%SRC%\helton_diario_*.png" "%DEST%\helton_diario.png" /Y
copy "%SRC%\helton_historico_mensal_*.png" "%DEST%\helton_historico_mensal.png" /Y
copy "%SRC%\helton_resumo_dia_*.png" "%DEST%\helton_resumo_dia.png" /Y
copy "%SRC%\helton_premium_event_card_*.png" "%DEST%\helton_premium_event_card.png" /Y
copy "%SRC%\layse_central_*.png" "%DEST%\layse_central.png" /Y
copy "%SRC%\layse_relacao_funcionarios_*.png" "%DEST%\layse_relacao_funcionarios.png" /Y
copy "%SRC%\layse_autorizacoes_abono_*.png" "%DEST%\layse_autorizacoes_abono.png" /Y

echo.
echo [3/3] [SUCESSO] Imagens copiadas para /screenshots!
echo.
pause
