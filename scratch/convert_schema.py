import json

try:
    with open('schema.json', 'r', encoding='utf-16') as f:
        data = json.load(f)
    
    with open('schema_utf8.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print("Success")
except Exception as e:
    print(f"Error: {e}")
