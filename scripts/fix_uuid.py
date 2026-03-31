import os

file_path = "js/notifications.js"
with open(file_path, "r", encoding="utf-8") as f:
    code = f.read()

# I will replace all occurrences of `userId` in the queries with `safeUserId` after defining it at the top of updateBadges.
import re

code = re.sub(
    r"const userId = localStorage\.getItem\('userId'\);",
    "const userId = localStorage.getItem('userId');\n            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;\n            const safeUserId = uuidPattern.test(userId) ? userId : '00000000-0000-0000-0000-000000000000';",
    code
)

# Also fix the duplicate safeUserId definition I injected earlier in B. Comunicados
code = re.sub(
    r"// Prevenir crash do Supabase[\s\S]*?const safeUserId = [\s\S]*?;",
    "",
    code
)

# And replace userId with safeUserId inside Promise.all queries that use it directly
code = re.sub(r"\.eq\('id', userId\)", ".eq('id', safeUserId)", code)
code = re.sub(r"\.eq\('funcionario_id', userId\)", ".eq('funcionario_id', safeUserId)", code)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(code)

print("UUID fix applied successfully via Python")
