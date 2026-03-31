import os

file_path = "screens/diario_funcionario.html"
with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

target = """                                        `;
                                    })() };
                                }

                                if (item.itemType === 'CRONOGRAMA_FERIAS') {"""

replacement = """                                        `;
                                    })() }`;
                                }

                                if (item.itemType === 'CRONOGRAMA_FERIAS') {"""

html = html.replace(target, replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Python syntax fix applied.")
