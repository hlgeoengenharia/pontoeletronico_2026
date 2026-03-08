import json
import urllib.request
import os
import re

json_file = r"C:\Users\Windows 11\.gemini\antigravity\brain\3e14cbcb-28bb-4ec9-85e6-f9879d4fad06\.system_generated\steps\18\output.txt"
out_dir = r"c:\Users\Windows 11\Documents\Projetos\Projeto_V01\screens"

os.makedirs(out_dir, exist_ok=True)

with open(json_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

for screen in data.get('screens', []):
    title = screen.get('title', 'Unknown')
    # Clean title to use as a valid filename
    safe_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')
    url = screen.get('htmlCode', {}).get('downloadUrl')
    
    if url:
        print(f"Downloading {title} as {safe_title}.html...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response:
                html = response.read().decode('utf-8')
            
            file_path = os.path.join(out_dir, f"{safe_title}.html")
            with open(file_path, 'w', encoding='utf-8') as out_f:
                out_f.write(html)
            print(f"Saved to {file_path}")
        except Exception as e:
            print(f"Error downloading {title}: {e}")

print("All done!")
