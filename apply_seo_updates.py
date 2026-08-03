import json
import os
import re

BASE = os.getcwd() + os.sep  # run this from inside the repo folder

person_jsonld_obj = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Emily Reardon",
    "url": "https://emilyreardon.org",
    "jobTitle": "Designer, Inventor, and Creative Technologist",
    "description": "Emmy Award-winning designer, inventor, creative technologist, and artist-researcher working at the intersection of public-interest AI, feminist tech futures, and human-AI interaction.",
    "alumniOf": [
        {"@type": "CollegeOrUniversity", "name": "Brown University"},
        {"@type": "CollegeOrUniversity", "name": "New York University"},
        {"@type": "CollegeOrUniversity", "name": "CUNY Hunter College"}
    ],
    "affiliation": {
        "@type": "Organization",
        "name": "Digital Futures Institute, Teachers College, Columbia University"
    },
    "award": [
        "Emmy Award, New Approaches in Children's TV (2009, 2010)",
        "Peabody Award (2009)"
    ],
    "sameAs": [
        "https://www.linkedin.com/in/emily-reardon/",
        "https://github.com/emilyreardon"
    ],
    "knowsAbout": [
        "Public-Interest AI",
        "Human-AI Interaction",
        "Feminist Technology",
        "Creative Technology",
        "Learning Design",
        "Interaction Design"
    ]
}
person_jsonld = json.dumps(person_jsonld_obj, indent=2)

pages = {
    "index.html": {
        "old_title": "Emily Reardon | Landing",
        "new_title": "Emily Reardon",
        "canonical": "https://emilyreardon.org/",
        "description": "Emily Reardon is an Emmy Award-winning designer, inventor, and creative technologist building public-interest AI, feminist tech futures, and human-AI interaction experiences.",
    },
    "about.html": {
        "old_title": "Emily Reardon | About",
        "new_title": "Emily Reardon | About",
        "canonical": "https://emilyreardon.org/about.html",
        "description": "About Emily Reardon: Emmy Award-winning designer, researcher, and creative technologist. Former Director of UX at Sesame Workshop; now a Fellow at Columbia's Digital Futures Institute and MFA candidate at CUNY Hunter College.",
    },
    "projects.html": {
        "old_title": "Emily Reardon | Projects",
        "new_title": "Emily Reardon | Projects",
        "canonical": "https://emilyreardon.org/projects.html",
        "description": "Selected projects by Emily Reardon spanning ethical AI art, interactive design, and public media \u2014 from Sesame Street to public-interest AI research.",
    },
    "writing.html": {
        "old_title": "Emily Reardon | Writing",
        "new_title": "Emily Reardon | Writing",
        "canonical": "https://emilyreardon.org/writing.html",
        "description": "Publications, patents, and talks by Emily Reardon on public-interest AI, learning design, and human-computer interaction.",
    },
    "teaching.html": {
        "old_title": "Emily Reardon | Teaching",
        "new_title": "Emily Reardon | Teaching",
        "canonical": "https://emilyreardon.org/teaching.html",
        "description": "Emily Reardon's teaching experience in emerging technology, design, and learning at NYU, Harvard, and the School of Visual Arts.",
    },
}

for fname, cfg in pages.items():
    path = BASE + fname
    if not os.path.exists(path):
        print(f"SKIPPED (not found): {fname}")
        continue

    with open(path, "r", encoding="utf-8", newline="") as f:
        content = f.read()

    if "meta name=\"description\"" in content:
        print(f"ALREADY UPDATED, skipping: {fname}")
        continue

    nl = "\r\n" if "\r\n" in content else "\n"

    old_title_tag = f"<title>{cfg['old_title']}</title>"
    new_title_tag = f"<title>{cfg['new_title']}</title>"
    if old_title_tag not in content:
        print(f"WARNING: title tag not found as expected in {fname}, skipping")
        continue

    json_lines = person_jsonld.replace("\n", nl)

    seo_block_lines = [
        f'  <meta name="description" content="{cfg["description"]}">',
        f'  <link rel="canonical" href="{cfg["canonical"]}">',
        '  <meta property="og:type" content="website">',
        '  <meta property="og:site_name" content="Emily Reardon">',
        f'  <meta property="og:title" content="{cfg["new_title"]}">',
        f'  <meta property="og:description" content="{cfg["description"]}">',
        f'  <meta property="og:url" content="{cfg["canonical"]}">',
        '  <meta name="twitter:card" content="summary">',
        f'  <meta name="twitter:title" content="{cfg["new_title"]}">',
        f'  <meta name="twitter:description" content="{cfg["description"]}">',
        f'  <script type="application/ld+json">{nl}{json_lines}{nl}  </script>',
    ]
    seo_block = nl.join(seo_block_lines)

    replacement = new_title_tag + nl + seo_block
    content = content.replace(old_title_tag, replacement, 1)

    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(content)

    print(f"Updated {fname}")

# robots.txt
robots_path = BASE + "robots.txt"
if not os.path.exists(robots_path):
    with open(robots_path, "w", encoding="utf-8", newline="\n") as f:
        f.write("User-agent: *\nAllow: /\n\nSitemap: https://emilyreardon.org/sitemap.xml\n")
    print("Created robots.txt")
else:
    print("robots.txt already exists, left untouched")

# sitemap.xml
sitemap_path = BASE + "sitemap.xml"
if not os.path.exists(sitemap_path):
    sitemap_content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://emilyreardon.org/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://emilyreardon.org/about.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://emilyreardon.org/projects.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://emilyreardon.org/writing.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://emilyreardon.org/teaching.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
"""
    with open(sitemap_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(sitemap_content)
    print("Created sitemap.xml")
else:
    print("sitemap.xml already exists, left untouched")

print("\nDone. Run `git diff` to review before committing.")
