// Add editable page data without replacing existing editorial files.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';
import Turndown from 'turndown';
const markdown = new Turndown({ emDelimiter: '*', bulletListMarker: '-' });
const text = node => node?.textContent.trim() || '';
const lines = node => { const copy = node.cloneNode(true); copy.querySelectorAll('br').forEach(br => br.replaceWith('\n')); return text(copy); };
const intro = d => ({ eyebrow: text(d.querySelector('.eyebrow')), title: text(d.querySelector('.page-title')), intro: text(d.querySelector('.page-description')) });

export function extractResearch(html) {
  const d = parseHTML(html).document;
  const sections = [];
  let section;
  const card = element => {
    const image = element.querySelector('img');
    const video = element.querySelector('iframe');
    const title = text(element.querySelector('h2'));
    return { editor_title: title || image?.getAttribute('alt') || 'Introduction',
      layout: element.classList.contains('feature-card') ? 'feature' : 'research', title,
      body: markdown.turndown([...element.querySelectorAll('p')].map(p => p.outerHTML).join('\n')),
      image: image?.getAttribute('src') || '', image_alt: image?.getAttribute('alt') || '',
      video_url: video?.getAttribute('src') || '', video_title: video?.getAttribute('title') || '' };
  };
  for (const element of d.querySelector('.page-content').children) {
    if (element.matches('.section-heading')) {
      const title = lines(element); section = { editor_title: title, title, items: [] }; sections.push(section);
    } else {
      const cards = element.matches('article') ? [element] : [...element.querySelectorAll('article')];
      if (cards.length && !section) { section = { editor_title: 'Research introduction', title: '', items: [] }; sections.push(section); }
      section?.items.push(...cards.map(card));
    }
  }
  return { ...intro(d), sections };
}
export function extractHome(html) {
  const d = parseHTML(html).document;
  return { title: text(d.querySelector('.hero h1')), affiliation: [...d.querySelectorAll('.hero-affiliation span')].map(text).join('\n'),
    intro: text(d.querySelector('.hero-copy')), intro_ko: text(d.querySelector('.hero-ko')),
    background: d.querySelector('.hero-base').getAttribute('src'), background_alt: d.querySelector('.hero-base').getAttribute('alt'),
    research_label: text(d.querySelector('.research-areas .eyebrow')),
    areas: [...d.querySelectorAll('.area-card')].map(card => ({ title: text(card.querySelector('h3')), body: text(card.querySelector('p')) })) };
}
export function extractContact(html) {
  const d = parseHTML(html).document;
  const iframe = d.querySelector('.map-frame iframe'), url = new URL(iframe.getAttribute('src'));
  return { ...intro(d), offices: [...d.querySelectorAll('.address-card')].map(card => {
    const ps = card.querySelectorAll('p'); return { title: text(card.querySelector('h2')), english: lines(ps[0]), korean: lines(ps[1]) };
  }), map_query: url.searchParams.get('q'), map_zoom: Number(url.searchParams.get('z') || 16), map_title: iframe.getAttribute('title') };
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  for (const [name, file, extract] of [['home', 'index.html', extractHome], ['research', 'research.html', extractResearch], ['contact', 'contact.html', extractContact]]) {
    const data = extract(await fs.readFile(path.join(root, file), 'utf8'));
    try { await fs.writeFile(path.join(root, `content/${name}.json`), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' }); console.log(`Created ${name}; existing page content preserved.`); }
    catch (error) { if (error.code !== 'EEXIST') throw error; console.log(`Kept existing ${name} editorial data.`); }
  }
}
