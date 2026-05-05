
import json

try:
    with open('schema.json', 'r', encoding='utf-16') as f:
        data = json.load(f)
        
    tables = data.get('tables', [])
    diario_logs = next((t for t in tables if t.get('name') == 'diario_logs'), None)
    
    if diario_logs:
        print("COLUMNS IN diario_logs:")
        for col in diario_logs.get('columns', []):
            print(f"- {col.get('name')} ({col.get('type')})")
    else:
        print("Table diario_logs not found in schema.json")
except Exception as e:
    print(f"Error: {e}")
