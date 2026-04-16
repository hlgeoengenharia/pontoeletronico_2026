import os

filepath = r'c:\Users\Windows 11\Documents\Projetos\Projeto_V01\pontoeletronico_2026\screens\perfil_funcionario.html'

with open(filepath, 'rb') as f:
    content = f.read()

# Normalize all line endings to CRLF
content = content.replace(b'\r\n', b'\n').replace(b'\r', b'\n').replace(b'\n', b'\r\n')

# Remove the dead "Gatilho Unificado" block
old_block = b'                    mostrarModalConfirmacaoBio(dataUrl);\r\n                    \r\n                    // Gatilho Unificado\r\n                    setTimeout(() => {\r\n                        const btnBio = document.getElementById(\'btn-registrar-biometria\');\r\n                        if (btnBio) {\r\n                            btnBio.scrollIntoView({ behavior: \'smooth\' });\r\n                            btnBio.classList.add(\'animate-bounce\');\r\n                            setTimeout(() => btnBio.classList.remove(\'animate-bounce\'), 3000);\r\n                        }\r\n                    }, 1000);\r\n                };'

new_block = b'                    mostrarModalConfirmacaoBio(dataUrl);\r\n                };'

if old_block in content:
    content = content.replace(old_block, new_block)
    print("SUCCESS: Gatilho Unificado block removed")
else:
    print("WARNING: Block not found - already cleaned or different content")

# Also clean up the dead code check block (loggedUserCheck)
old_dead = b"                    const loggedUserCheck = loggedUser;\r\n                    const employeeIdParamCheck = employeeIdParam;\r\n                    if (false && employeeIdParamCheck && employeeIdParamCheck !== loggedUserCheck?.id) {\r\n                        UI.showToast(\"A biometria deve ser cadastrada pelo pr\xc3\xb3prio colaborador no perfil dele.\", \"warning\");\r\n                        return;\r\n                    }\r\n\r\n                    const preview = document.getElementById('user-photo-profile');\r\n                    const btnRemover = document.getElementById('btn-remover-foto');"

new_dead = b"                    const preview = document.getElementById('user-photo-profile');\r\n                    const btnRemover = document.getElementById('btn-remover-foto');"

if old_dead in content:
    content = content.replace(old_dead, new_dead)
    print("SUCCESS: Dead code block cleaned up")
else:
    print("INFO: Dead code block not found or already clean")

with open(filepath, 'wb') as f:
    f.write(content)

print("DONE: File saved with normalized encoding")
