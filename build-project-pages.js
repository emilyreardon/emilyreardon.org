#!/usr/bin/env node
/*
  build-project-pages.js
  Writes one static HTML page per project (e.g. research-for-humans.html),
  using the project data, header, styles, and footer already in projects.html.

  Run from this folder after editing projects.html:
      node build-project-pages.js

  Every project needs a `page:` field (the filename). Optional tombstone fields:
      medium: short materials line
      shown:  "Exhibited at ..." / "Presented at ..."
      credit: "With ..." (collaborators) or "For ..." (organization)
*/
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://emilyreardon.org/';
const src = fs.readFileSync(path.join(ROOT, 'projects.html'), 'utf8');

/* ── Pull pieces out of projects.html ── */
function between(str, start, end, includeEnds) {
  const a = str.indexOf(start);
  if (a < 0) throw new Error('Not found in projects.html: ' + start);
  const b = str.indexOf(end, a + start.length);
  if (b < 0) throw new Error('Not found in projects.html: ' + end);
  return includeEnds ? str.slice(a, b + end.length) : str.slice(a + start.length, b);
}
const dataSrc   = between(src, 'const projects = [', '\n  ];', false);
const projects  = new Function('return [' + dataSrc + '];')();
const fontsCss  = between(src, '<link rel="preconnect" href="https://fonts.googleapis.com">', '</style>', true);
const header    = between(src, '<header class="site-header">', '</header>', true);
const footer    = between(src, '<footer class="site-footer">', '</footer>', true);
const headerJs  = between(src, '/* ── Dot animation ── */', '/* ── Lightbox system ── */', true)
                    .replace('/* ── Lightbox system ── */', '');

/* ── Helpers ── */
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = p => esc(encodeURI(p));
const paras = s => String(s || '').split(/\n+/).filter(Boolean)
  .map(t => '<p class="project-body">' + esc(t) + '</p>').join('\n      ');
const EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
function resolveImage(base) {
  if (/\.[a-z0-9]{3,4}$/i.test(base)) return base;
  for (const e of EXTS) if (fs.existsSync(path.join(ROOT, base + e))) return base + e;
  console.warn('  ! no file found for ' + base);
  return base + '.jpg';
}
const videoType = s => s.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
function firstSentence(t, max) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^.*?[.!?](\s|$)/);
  let out = m ? m[0].trim() : t;
  if (out.length > max) out = out.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
  return out;
}

/* ── Media: flatten every media field into one ordered list ── */
function flatten(spec, list) {
  if (!spec) return;
  if (typeof spec === 'string') list.push({ kind: 'image', src: resolveImage(spec) });
  else if (spec.type === 'video') list.push({ kind: 'loop', sources: spec.sources });
  else if (spec.type === 'video-player') list.push({ kind: 'video', sources: spec.sources, poster: spec.thumbnailGif, ratio: spec.aspectRatio });
  else if (spec.type === 'vstack') (spec.rows || []).forEach(r => (Array.isArray(r) ? r : [r]).forEach(x => flatten(x, list)));
}
function collectMedia(p) {
  const main = [], process = [];
  (p.mediaRows || []).forEach(row => row.forEach(x => flatten(x, main)));
  (p.imagePairPaths || []).forEach(x => flatten(x, main));
  (p.imagePaths || []).forEach(b => (b.toLowerCase().includes('process') ? process : main).push({ kind: 'image', src: resolveImage(b) }));
  (p.videoPaths || []).forEach(v => main.push({ kind: 'video', sources: [v], poster: p.thumbnailGif }));
  (p.audioPaths || []).forEach(a => main.push({ kind: 'audio', src: a }));
  const gifs = (p.gifPaths || []).map(g => ({ kind: 'image', src: g }));
  return { main, process, gifs };
}
function mediaHtml(m, alt, i) {
  const loading = i === 0 ? 'eager' : 'lazy';
  if (m.kind === 'image') return `<figure><img src="${url(m.src)}" alt="${esc(alt)}" loading="${loading}"></figure>`;
  if (m.kind === 'audio') return `<figure class="wide"><audio controls preload="metadata" src="${url(m.src)}"></audio></figure>`;
  const srcs = m.sources.map(s => `<source src="${url(s)}" type="${videoType(s)}">`).join('');
  if (m.kind === 'loop') return `<figure><video autoplay muted loop playsinline aria-label="${esc(alt)}">${srcs}</video></figure>`;
  const poster = m.poster ? ` poster="${url(m.poster)}"` : '';
  const ratio = m.ratio ? ` style="aspect-ratio:${esc(m.ratio)}"` : '';
  return `<figure><video controls playsinline preload="metadata"${poster}${ratio} aria-label="${esc(alt)}">${srcs}</video></figure>`;
}

/* ── Page CSS (added after the projects.html styles) ── */
const pageCss = `
  <style>
    .work { padding: 2rem 0; border-top: 1px solid #000; border-bottom: 1px solid #000; }
    .back-link { display: inline-block; font-size: 0.78rem; color: #555; text-decoration: none; margin-bottom: 1.2rem; letter-spacing: 0.04em; }
    .back-link:hover { color: #000; }
    .work-title { font-size: 1.4rem; font-weight: bold; margin: 0 0 0.6rem 0; line-height: 1.3; letter-spacing: 0.02em; }
    .work-title em { font-style: italic; }
    .tombstone { font-size: 0.82rem; color: #333; line-height: 1.55; margin: 0 0 1.6rem 0; }
    .tombstone span { display: block; }
    .work-media { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 0 0 1.8rem 0; align-items: start; }
    .work-media figure { margin: 0; }
    .work-media figure:first-child, .work-media figure.wide { grid-column: 1 / -1; }
    .work-media img, .work-media video { display: block; width: 100%; height: auto; background: #f0f0f0; }
    .work-media audio { width: 100%; }
    .work-media figure:first-child img { width: auto; max-width: 100%; max-height: 85vh; margin: 0 auto; background: none; }
    .work-media.gifs { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
    .work-media.gifs figure:first-child { grid-column: auto; }
    .work-text { max-width: 680px; }
    .work-text .project-body + .project-body { margin-top: 0.7rem; }
    .work-text a { color: #111; }
    @media (max-width: 600px) {
      .work-media { grid-template-columns: 1fr; }
      .work-media.gifs { grid-template-columns: 1fr 1fr; }
    }
  </style>`;

/* ── Build each page ── */
let written = [];
projects.forEach((p, idx) => {
  if (!p.page) { console.warn('  ! skipped ' + p.title + ' (no page: field)'); return; }
  const { main, process, gifs } = collectMedia(p);
  const isArt = p.type !== 'professional';
  const firstImg = main.concat(gifs).find(m => m.kind === 'image');
  const ogImage = firstImg ? SITE + encodeURI(firstImg.src) : (p.thumbnailGif ? SITE + encodeURI(p.thumbnailGif) : '');
  const desc = firstSentence(p.description, 200);
  const pageTitle = `${p.title} (${p.year}) | Emily Reardon`;

  const tomb = [p.medium, p.shown, p.credit].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('\n        ');
  const mediaBlock = main.length
    ? `<div class="work-media">\n        ${main.map((m, i) => mediaHtml(m, p.title, i)).join('\n        ')}\n      </div>` : '';
  const gifBlock = gifs.length
    ? `<div class="work-media gifs">\n        ${gifs.map((m, i) => mediaHtml(m, p.title, i)).join('\n        ')}\n      </div>` : '';
  const processBlock = process.length
    ? `<p class="project-label">Process Documentation</p>\n      <div class="work-media">\n        ${process.map((m, i) => mediaHtml(m, p.title + ' process', i + 1)).join('\n        ')}\n      </div>` : '';
  const modelCard = p.modelCardUrl
    ? `<p class="project-label">AI Model Card</p>\n      <p class="project-body"><a href="${esc(p.modelCardUrl)}" target="_blank" rel="noopener">Read the model card for this work</a></p>` : '';

  const prev = projects[(idx - 1 + projects.length) % projects.length];
  const next = projects[(idx + 1) % projects.length];

  const ld = {
    '@context': 'https://schema.org',
    '@type': isArt ? 'VisualArtwork' : 'CreativeWork',
    name: p.title, dateCreated: p.year, url: SITE + p.page,
    creator: { '@type': 'Person', name: 'Emily Reardon', url: SITE },
    description: desc
  };
  if (p.medium) ld[isArt ? 'artMedium' : 'material'] = p.medium;
  if (ogImage) ld.image = ogImage;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Generated by build-project-pages.js from projects.html. Edit projects.html, then run: node build-project-pages.js -->
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${SITE}${p.page}">
  <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="shortcut icon" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Emily Reardon">
  <meta property="og:title" content="${esc(p.title + ' (' + p.year + ')')}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${SITE}${p.page}">
${ogImage ? `  <meta property="og:image" content="${esc(ogImage)}">\n` : ''}  <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${esc(p.title + ' (' + p.year + ')')}">
  <meta name="twitter:description" content="${esc(desc)}">
${ogImage ? `  <meta name="twitter:image" content="${esc(ogImage)}">\n` : ''}  <script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
  </script>
  ${fontsCss}
${pageCss}
</head>
<body>


${header}


<main class="main-content">
  <a class="back-link" href="projects.html">&larr; All projects</a>
  <article class="work">
    <h2 class="work-title"><em>${esc(p.title)}</em>, ${esc(p.year)}</h2>
    ${tomb ? `<p class="tombstone">\n        ${tomb}\n    </p>` : ''}

    ${mediaBlock}
    ${gifBlock}

    <div class="work-text">
      <p class="project-label">Project Description</p>
      ${paras(p.description)}
      <p class="project-label">Rationale</p>
      ${paras(p.rationale)}
      ${p.role ? `<p class="project-label">My Role</p>\n      <p class="project-body">${esc(p.role)}</p>` : ''}
      ${modelCard}
    </div>
    ${processBlock}
  </article>
  <nav class="tombstone" style="display:flex;justify-content:space-between;gap:1rem;margin-top:1rem;" aria-label="More projects">
    <a class="back-link" href="${esc(prev.page)}">&larr; ${esc(prev.title)}</a>
    <a class="back-link" href="${esc(next.page)}" style="text-align:right;">${esc(next.title)} &rarr;</a>
  </nav>
</main>


${footer}


<script>
  ${headerJs.trim()}
</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, p.page), html.replace(/\n\s*\n\s*\n\s*\n/g, '\n\n\n'));
  written.push(p.page);
  console.log('  wrote ' + p.page);
});

/* ── Sitemap: main pages + every project page ── */
const mainPages = [['', '1.0'], ['about.html', '0.9'], ['projects.html', '0.9'], ['writing.html', '0.7'], ['teaching.html', '0.7']];
const entries = mainPages.map(([u, pr]) => [u, pr]).concat(written.map(w => [w, '0.8']));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  entries.map(([u, pr]) => `  <url>\n    <loc>${SITE}${u}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${pr}</priority>\n  </url>`).join('\n') +
  '\n</urlset>\n';
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('  updated sitemap.xml (' + written.length + ' project pages)');
