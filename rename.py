import os
import re
import unicodedata

def remove_accents(input_str):
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    return u"".join([c for c in nfkd_form if not unicodedata.combining(c)])

def clean_filename(filename):
    name, ext = os.path.splitext(filename)
    
    # 1. Remove accents
    name = remove_accents(name)
    
    # 2. Replace hyphens with spaces (to be handled by next step)
    name = name.replace('-', ' ')
    
    # 3. Replace multiple underscores or spaces with a single space
    name = re.sub(r'[\s_]+', ' ', name).strip()
    
    # 4. Replace spaces with single underscore
    name = name.replace(' ', '_')
    
    return name + ext

directory = r"C:\Users\Windows 11\Documents\Projetos\Projeto_V01\screens"

for filename in os.listdir(directory):
    if filename.endswith(".html"):
        old_path = os.path.join(directory, filename)
        new_name = clean_filename(filename)
        new_path = os.path.join(directory, new_name)
        
        if old_path != new_path:
            os.rename(old_path, new_path)
            print(f"Renamed: {filename} -> {new_name}")

print("Done renaming files.")
