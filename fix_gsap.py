import os

files = [
    "apps/web/components/about/about-experience.tsx",
    "apps/web/components/about/about-education.tsx",
    "apps/web/components/about/about-skills.tsx"
]

for file in files:
    with open(file, "r") as f:
        content = f.read()
    
    content = content.replace("import { useGSAP } from '@gsap/react';", "import { useEffect } from 'react';")
    content = content.replace("useGSAP(() => {", "useEffect(() => {\n    const ctx = gsap.context(() => {")
    content = content.replace("  }, { scope: container });", "    }, container);\n    return () => ctx.revert();\n  }, []);")
    
    with open(file, "w") as f:
        f.write(content)
