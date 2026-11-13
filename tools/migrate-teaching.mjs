// One-time Teaching conversion. Refuses to replace existing editorial data.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';
import Turndown from 'turndown';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markdown = new Turndown({ emDelimiter: '*', bulletListMarker: '-' });
const text = node => node?.textContent.trim() || '';
function headingText(node) {
  const copy = node.cloneNode(true);
  copy.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  return text(copy);
}
function courseData(card) {
  const copy = card.querySelector('.course-copy').cloneNode(true);
  const title = text(copy.querySelector('h2'));
  copy.querySelector('h2')?.remove();
  const gallery = [];
  let afterGallery = false, body = '', details = '';
  for (const node of copy.childNodes) {
    if (node.nodeType === 1 && node.classList.contains('sensing-grid')) {
      afterGallery = true;
      gallery.push(...[...node.querySelectorAll('img')].map(img => ({ image: img.getAttribute('src'), image_alt: img.getAttribute('alt') || '' })));
    } else {
      const html = node.outerHTML || node.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (afterGallery) details += html; else body += html;
    }
  }
  const image = [...card.children].find(node => node.tagName === 'IMG');
  return { editor_title: title || 'Course details', title, image: image?.getAttribute('src') || '', image_alt: image?.getAttribute('alt') || '',
    body: markdown.turndown(body), gallery, details: markdown.turndown(details) };
}
export function extractTeaching(html) {
  const document = parseHTML(html).document;
  const sections = [];
  let section;
  for (const node of document.querySelector('.page-content').children) {
    if (node.matches('h2.section-heading')) {
      section = { title: headingText(node), courses: [] };
      sections.push(section);
    } else {
      const cards = node.matches('.course-card') ? [node] : [...node.querySelectorAll('.course-card')];
      if (cards.length && !section) throw new Error('Course has no section heading.');
      section?.courses.push(...cards.map(courseData));
    }
  }
  // The old static page accidentally reused the Publications heading.
  return { eyebrow: 'TEACHING', title: 'Teaching', description: '', sections };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const data = extractTeaching(await fs.readFile(path.join(root, 'teaching.html'), 'utf8'));
  await fs.writeFile(path.join(root, 'content/teaching.json'), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
  console.log(`Preserved ${data.sections.length} course groups and ${data.sections.reduce((n, s) => n + s.courses.length, 0)} course cards.`);
}
