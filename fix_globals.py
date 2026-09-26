import re

file_path = "/Users/ashokbhattarai/Pictures/Portfilio/apps/web/styles/globals.css"
with open(file_path, "r") as f:
    content = f.read()

replacements = [
    (r'#0c213c', r'var(--deep)'),
    (r'#527747', r'var(--accent)'),
    (r'#c7dca8', r'var(--highlight)'),
    (r'#b7c8bc', r'var(--muted)'),
    (r'#e5e9dc', r'var(--paper)'),
    (r'#091a33', r'var(--deep)'),
    (r'#3f5c36', r'color-mix(in srgb, var(--accent) 80%, black)'),
]

for old, new in replacements:
    content = re.sub(old, new, content, flags=re.IGNORECASE)

with open(file_path, "w") as f:
    f.write(content)

print("Done")
