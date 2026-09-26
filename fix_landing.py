import re

with open("apps/web/app/(public)/landing.module.css", "r") as f:
    css = f.read()

# Reduce min-heights inside .portraitStrip media queries by 20%
css = re.sub(r'(?<=min-height: )380px', '320px', css)
css = re.sub(r'(?<=min-height: )320px', '280px', css)
css = re.sub(r'(?<=min-height: )280px', '220px', css)

with open("apps/web/app/(public)/landing.module.css", "w") as f:
    f.write(css)
