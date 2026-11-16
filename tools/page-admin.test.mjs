import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { root, readContent, renderPage, safeUrl } from './build.mjs';
import { extractHome, extractResearch, extractContact } from './migrate-pages.mjs';
import { validatePageContent, youtubeEmbed } from './editable-pages.mjs';
import { createConfig } from '../admin/collections.js';
import { installPageNavigation, PAGE_ORDER } from '../admin/page-navigation.js';

const data = await readContent();
const doc = html => parseHTML(html).document;
const source = Object.fromEntries(await Promise.all(['index.html', 'research.html', 'contact.html'].map(async f => [f, await fs.readFile(path.join(root, f), 'utf8')])));
const compact = node => node.textContent.replace(/\s/g, '');
const attributes = (node, selector, attrs) => [...node.querySelectorAll(selector)].map(el => attrs.map(a => el.getAttribute(a)));

test('Research conversion preserves all complete descriptions, headings, images and videos', async () => {
  const research = validatePageContent('research', extractResearch(source['research.html']), safeUrl);
  const original = doc(source['research.html']);
  const output = doc(await renderPage('research.html', root, { ...data, research }));
  assert.equal(compact(output.querySelector('.page-content')), compact(original.querySelector('.page-content')));
  assert.equal(compact(output.querySelector('.page-intro')), compact(original.querySelector('.page-intro')));
  for (const [selector, attrs] of [['.page-content img', ['src','alt']], ['.page-content iframe', ['src','title','allowfullscreen']]]) assert.deepEqual(attributes(output, selector, attrs), attributes(original, selector, attrs));
  assert.equal(output.querySelectorAll('.page-content article').length, 16);
  assert.equal(output.querySelectorAll('.page-content iframe').length, 12);
});

test('Home and Contact conversion preserve the hero, area cards, addresses and map', async () => {
  const home = validatePageContent('home', extractHome(source['index.html']), safeUrl);
  const contact = validatePageContent('contact', extractContact(source['contact.html']), safeUrl);
  const beforeHome = doc(source['index.html']), afterHome = doc(await renderPage('index.html', root, { ...data, home }));
  for (const selector of ['.hero-content', '.research-areas']) assert.equal(compact(afterHome.querySelector(selector)), compact(beforeHome.querySelector(selector)));
  assert.deepEqual(attributes(afterHome, '.hero img', ['src','alt']), attributes(beforeHome, '.hero img', ['src','alt']));
  const before = doc(source['contact.html']), after = doc(await renderPage('contact.html', root, { ...data, contact }));
  assert.equal(compact(before.querySelector('.page-content')), compact(after.querySelector('.page-content')));
  assert.deepEqual(attributes(after, 'iframe', ['src','title']), attributes(before, 'iframe', ['src','title']));
  assert.match(after.documentElement.textContent, /604 Innovation Building/);
});

test('Research groups, rich descriptions, images, videos and order are editable', async () => {
  const research = extractResearch(source['research.html']);
  const item = { editor_title: 'New work', layout: 'research', title: 'New research', body: '**Full description**\n\n- First result\n- Second result\n\n[Paper](https://example.com/paper)', video_url: 'https://youtu.be/78f6eiWVWrE?t=5', video_title: 'New video' };
  research.sections.unshift({ title: 'NEW WORK', items: [item] });
  research.sections[1].items[0].image = '/uploads/research/smart-city.webp';
  const output = doc(await renderPage('research.html', root, { ...data, research: validatePageContent('research', research, safeUrl) }));
  assert.equal(output.querySelector('.section-heading').textContent, 'NEW WORK');
  assert.equal(output.querySelector('.page-content iframe').getAttribute('src'), 'https://www.youtube.com/embed/78f6eiWVWrE');
  assert.equal(output.querySelector('.research-copy strong').textContent, 'Full description');
  assert.equal(output.querySelectorAll('.research-copy li').length, 2);
  assert.equal(output.querySelector('.research-copy a').getAttribute('href'), 'https://example.com/paper');
  assert.equal(output.querySelector('.page-content img').getAttribute('src'), 'uploads/research/smart-city.webp');
  research.sections.reverse();
  const reordered = doc(await renderPage('research.html', root, { ...data, research }));
  assert.equal(reordered.querySelector('.section-heading').textContent, research.sections[0].title);
});

test('Home and Contact edits reach the generated public pages', async () => {
  const copy = { ...structuredClone(data), home: extractHome(source['index.html']), contact: extractContact(source['contact.html']) };
  copy.home.title = 'Updated laboratory'; copy.home.areas.reverse(); copy.home.areas[0].body = 'New research summary';
  const home = doc(await renderPage('index.html', root, copy));
  assert.equal(home.querySelector('h1').textContent, copy.home.title);
  assert.equal(home.querySelector('.area-card h3').textContent, copy.home.areas[0].title);
  assert.equal(home.querySelector('.area-card p').textContent, 'New research summary');
  assert.equal(home.querySelectorAll('.news-preview').length, Math.min(3, data.news.length));
  copy.contact.offices[1].english = '605 Innovation Building\nKorea University';
  copy.contact.map_query = 'Korea University Innovation Building';
  const contact = doc(await renderPage('contact.html', root, copy));
  assert.match(contact.querySelectorAll('.address-card')[1].innerHTML, /605 Innovation Building<br>Korea University/);
  assert.equal(new URL(contact.querySelector('iframe').getAttribute('src')).searchParams.get('q'), copy.contact.map_query);
});

test('Page inputs reject unsafe media and sanitize authored rich text', async () => {
  for (const url of ['javascript:alert(1)', 'http://youtube.com/watch?v=78f6eiWVWrE', 'https://youtube.com.evil.example/embed/78f6eiWVWrE', 'https://example.com/embed/78f6eiWVWrE', 'https://user:pass@youtube.com/embed/78f6eiWVWrE']) assert.throws(() => youtubeEmbed(url));
  assert.equal(youtubeEmbed('https://www.youtube.com/watch?v=78f6eiWVWrE&autoplay=1'), 'https://www.youtube.com/embed/78f6eiWVWrE');
  const copy = { ...structuredClone(data), research: extractResearch(source['research.html']), home: extractHome(source['index.html']), contact: extractContact(source['contact.html']) }; const item = copy.research.sections[0].items[0];
  item.title = '<script>bad()</script>'; item.body = '<script>bad()</script>\n\n[bad](javascript:bad()) **Safe**';
  const output = doc(await renderPage('research.html', root, copy));
  assert.equal(output.querySelector('.page-content script'), null);
  assert.equal(output.querySelector('.page-content a[href^="javascript"]'), null);
  assert.equal(output.querySelector('.research-copy h2').textContent, item.title);
  item.image = '/uploads/../private.png'; assert.throws(() => validatePageContent('research', copy.research, safeUrl));
  item.image = ''; item.video_url = 'https://example.com'; assert.throws(() => validatePageContent('research', copy.research, safeUrl));
  copy.home.background = '//example.com/image.png'; assert.throws(() => validatePageContent('home', copy.home, safeUrl));
  copy.contact.map_zoom = '16'; assert.throws(() => validatePageContent('contact', copy.contact, safeUrl));
});

test('Missing page data keeps the static fallback; malformed data stops the build', async t => {
  for (const file of ['research.html','contact.html']) assert.equal(await renderPage(file, root, { ...data, research: undefined, contact: undefined }), source[file]);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ssail-pages-'));
  t.after(async () => { if (path.dirname(temp) === path.resolve(os.tmpdir()) && path.basename(temp).startsWith('ssail-pages-')) await fs.rm(temp, { recursive: true, force: true }); });
  for (const folder of ['undergraduates','alumni','publications','news']) await fs.mkdir(path.join(temp, 'content', folder), { recursive: true });
  await fs.writeFile(path.join(temp, 'content/current.json'), '{"members":[]}');
  await fs.writeFile(path.join(temp, 'content/undergraduates/2026.json'), '{"year":2026,"members":[]}');
  assert.equal((await readContent(temp)).research, undefined);
  await fs.writeFile(path.join(temp, 'content/research.json'), '{broken'); await assert.rejects(readContent(temp), SyntaxError);
  await fs.writeFile(path.join(temp, 'content/research.json'), '{"title":"Research","sections":null}');
  assert.deepEqual((await readContent(temp)).research.sections, []);
});

test('Admin collections follow website menu order and keep all People editors and years', async () => {
  const config = createConfig({ repo: 'ssail-main/ssail-website', branch: 'main' });
  assert.deepEqual(config.collections.map(c => c.name), PAGE_ORDER);
  const byName = Object.fromEntries(config.collections.map(c => [c.name,c]));
  assert.equal(byName.undergraduates.folder, 'content/undergraduates');
  assert.equal(byName.undergraduates.create, true); assert.equal(byName.undergraduates.hide, undefined);
  assert.ok(data.years.every(year => Number.isInteger(year.year) && Array.isArray(year.members)));
  assert.equal(byName.current.files[0].file, 'content/current.json');
  assert.equal(byName.alumni.folder, 'content/alumni');
  for (const name of ['home','research','contact']) {
    assert.equal(byName[name].files[0].file, `content/${name}.json`);
    await fs.access(path.join(root, byName[name].files[0].file));
  }
  assert.equal(config.locale, 'en'); assert.doesNotMatch(JSON.stringify(config.collections), /[가-힣]/);
});

test('People grouping preserves native links, search, routes and reappears after sidebar rerender', async () => {
  const { document, window } = parseHTML('<html><body><aside id="cms-sidebar"><h2>Collections</h2><input aria-label="Search all"><ul></ul></aside><aside id="other">Other toolbar</aside></body></html>');
  window.location = { hash: '#/collections/undergraduates' };
  const list = document.querySelector('ul');
  const fixture = () => PAGE_ORDER.map(name => `<li><a href="#/collections/${name}" data-testid="${name}">${name}</a></li>`).join('');
  list.innerHTML = fixture();
  const original = document.querySelector('a[data-testid="undergraduates"]');
  let nativeClick = false; original.addEventListener('click', () => { nativeClick = true; });
  const ui = installPageNavigation({ document, window });
  assert.equal(list.querySelectorAll('.ssail-people-heading').length, 1);
  assert.equal(list.querySelector('.ssail-people-heading h3').textContent, 'People');
  assert.equal(list.querySelectorAll('.ssail-people-child').length, 3);
  assert.equal(document.querySelector('a[data-testid="undergraduates"]'), original);
  assert.equal(original.getAttribute('href'), '#/collections/undergraduates');
  original.click(); assert.equal(nativeClick, true);
  assert.ok(original.getAttribute('aria-label').startsWith('People:'));
  assert.equal(document.querySelector('input').getAttribute('aria-label'), 'Search all');
  ui.refresh(); assert.equal(list.querySelectorAll('.ssail-people-heading').length, 1);
  list.innerHTML = fixture();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(list.querySelectorAll('.ssail-people-heading').length, 1);
  assert.equal(list.querySelectorAll('.ssail-people-child').length, 3);
  ui.destroy(); assert.equal(document.querySelector('.ssail-people-heading'), null);
  list.innerHTML = fixture(); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(document.querySelector('.ssail-people-heading'), null);
});
