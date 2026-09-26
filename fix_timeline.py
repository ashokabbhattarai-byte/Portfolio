with open("apps/web/components/about/about-sections.module.css", "r") as f:
    css = f.read()

css = css.replace(".timelineLine {", ".timelineLine {\n  transform-origin: top;")

with open("apps/web/components/about/about-sections.module.css", "w") as f:
    f.write(css)
