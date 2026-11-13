import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { createConfig } from '../admin/collections.js';
import { extractTeaching } from './migrate-teaching.mjs';
import { root, readContent, renderPage, teachingHtml, validateTeaching } from './build.mjs';

const source = await fs.readFile(path.join(root, 'teaching.html'), 'utf8');
const migrated = extractTeaching(source);
const data = await readContent();
const doc = html => parseHTML(html).document;
const normalize = node => node.textContent.replace(/\s/g, '');
const links = node => [...node.querySelectorAll('a')].map(a => a.getAttribute('href'));
const images = node => [...node.querySelectorAll('img')].map(i => [i.getAttribute('src'), i.getAttribute('alt')]);

test('Teaching migration preserves all full text, images, links and section order', async () => {
  const before = doc(source);
  const after = doc(await renderPage('teaching.html', root, { ...data, teaching: validateTeaching(structuredClone(migrated)) }));
  assert.equal(after.querySelector('.page-title').textContent, 'Teaching');
  assert.deepEqual([...after.querySelectorAll('.section-heading')].map(normalize), [...before.querySelectorAll('.section-heading')].map(normalize));
  const oldCards = [...before.querySelectorAll('.course-card')];
  const newCards = [...after.querySelectorAll('.course-card')];
  assert.equal(newCards.length, oldCards.length);
  for (const [i, card] of newCards.entries()) {
    assert.equal(normalize(card), normalize(oldCards[i]), 'complete course text ' + i);
    assert.deepEqual(images(card), images(oldCards[i]));
    assert.deepEqual(links(card), links(oldCards[i]));
  }
  assert.equal(after.querySelector('.sensing-grid').children.length, 3);
  assert.match(newCards.at(-1).textContent, /Scheduled Fall, 2018/);
});

test('Teaching edits include new semesters, groups, galleries and authored order', async () => {
  const teaching = structuredClone(migrated);
  teaching.description = 'Courses and seminars\nKorea University';
  const course = { editor_title: 'New course', title: 'AI for Civil Engineering', image: '/uploads/cms/course.png', image_alt: 'New textbook',
    body: '**Course description**\n\n- Spring 2027\n- Fall 2027\n\n[Course page](https://example.com/course)',
    gallery: [{ image: '/uploads/cms/b.png', image_alt: 'Second figure' }, { image: '/uploads/cms/a.png', image_alt: 'First figure' }], details: 'Prerequisite: Linear algebra' };
  teaching.sections.unshift({ title: 'NEW COURSES\n2027', courses: [course] });
  teaching.sections[1].courses[0].body += '\n\n- 2027년도 2학기';
  teaching.sections[1].courses.reverse();
  const output = doc(await renderPage('teaching.html', root, { ...data, teaching: validateTeaching(teaching) }));
  const group = output.querySelector('.teaching-group');
  assert.equal(group.querySelector('.section-heading br').tagName, 'BR');
  assert.equal(group.querySelector('h2:not(.section-heading)').textContent, course.title);
  assert.match(group.textContent, /Spring 2027/);
  assert.equal(group.querySelector('.course-body strong').textContent, 'Course description');
  assert.equal(group.querySelector('.course-body a').getAttribute('href'), 'https://example.com/course');
  assert.deepEqual([...group.querySelectorAll('.sensing-grid img')].map(i => i.getAttribute('src')), ['uploads/cms/b.png','uploads/cms/a.png']);
  assert.equal(group.querySelector('.course-card > img').getAttribute('src'), 'uploads/cms/course.png');
  assert.match(output.querySelectorAll('.teaching-group')[1].textContent, /2027년도 2학기/);
  assert.equal(output.querySelectorAll('.teaching-group')[1].querySelector('.course-copy h2').textContent, teaching.sections[1].courses[0].title);
  assert.doesNotMatch(output.querySelector('.page-content').textContent, /New course/); // editor-only title
});

test('Teaching rich text and course fields cannot inject scripts or escape image paths', async () => {
  const rich = doc(teachingHtml('<script>alert(1)</script><img src=x onerror=bad()>\n\n**safe** [bad](javascript:alert(1)) [good](https://example.com)'));
  assert.equal(rich.querySelectorAll('script,img,[onerror],a[href^="javascript"]').length, 0);
  assert.equal(rich.querySelector('strong').textContent, 'safe');
  assert.equal(rich.querySelector('a[href="https://example.com"]').getAttribute('rel'), 'noopener noreferrer');
  const teaching = structuredClone(migrated);
  teaching.sections[0].courses[0].title = '<img src=x onerror=bad()>';
  const result = doc(await renderPage('teaching.html', root, { ...data, teaching }));
  assert.equal(result.querySelector('.course-copy h2').textContent, '<img src=x onerror=bad()>');
  assert.equal(result.querySelector('.course-copy h2 img'), null);
  for (const image of ['/uploads/../private.png','javascript:alert(1)','//evil.example/image.png']) {
    const copy = structuredClone(migrated); copy.sections[0].courses[0].image = image;
    assert.throws(() => validateTeaching(copy));
    copy.sections[0].courses[0].image = ''; copy.sections[0].courses[0].gallery = [{ image }];
    assert.throws(() => validateTeaching(copy));
  }
});

test('Teaching supports empty lists while rejecting incomplete course records', async () => {
  const teaching = validateTeaching({ title: 'Teaching', sections: null });
  assert.deepEqual(teaching.sections, []);
  assert.match(await renderPage('teaching.html', root, { ...data, teaching }), /Course information will be announced soon/);
  for (const value of [{ title: '', sections: [] }, { title: 'Teaching', sections: {} }, { title: 'Teaching', description: {}, sections: [] },
    { title: 'Teaching', sections: [{ title: 'Courses', courses: [{ title: 'Missing description' }] }] }]) assert.throws(() => validateTeaching(value));
});

test('Teaching rollout falls back only when the new data file is absent', async t => {
  assert.equal(await renderPage('teaching.html', root, { ...data, teaching: undefined }), source);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ssail-teaching-test-'));
  t.after(async () => { if (path.dirname(temp) === path.resolve(os.tmpdir()) && path.basename(temp).startsWith('ssail-teaching-test-')) await fs.rm(temp, { recursive: true, force: true }); });
  for (const folder of ['undergraduates','alumni','publications','news']) await fs.mkdir(path.join(temp,'content',folder), { recursive: true });
  await fs.writeFile(path.join(temp,'content/current.json'), '{"members":[]}');
  await fs.writeFile(path.join(temp,'content/undergraduates/2026.json'), '{"year":2026,"members":[]}');
  assert.equal((await readContent(temp)).teaching, undefined);
  await fs.writeFile(path.join(temp,'content/teaching.json'), '{broken json');
  await assert.rejects(readContent(temp), SyntaxError);
  await fs.writeFile(path.join(temp,'content/teaching.json'), '{"title":"Teaching","sections":[]}');
  assert.deepEqual((await readContent(temp)).teaching.sections, []);
});

test('Teaching admin exposes editable text, images and draggable groups/courses in English', () => {
  const config = createConfig({ repo: 'ssail-main/ssail-website', branch: 'main' });
  const collection = config.collections.find(c => c.name === 'teaching');
  assert.equal(collection.files[0].file, 'content/teaching.json');
  assert.equal(collection.delete, false);
  assert.equal(config.locale, 'en');
  assert.doesNotMatch(JSON.stringify(collection), /[가-힣]/);
  const groups = collection.files[0].fields.find(f => f.name === 'sections');
  const courses = groups.fields.find(f => f.name === 'courses');
  for (const list of [groups, courses]) { assert.equal(list.allow_reorder, true); assert.equal(list.add_to_top, true); }
  assert.equal(courses.fields.find(f => f.name === 'body').widget, 'markdown');
  assert.equal(courses.fields.find(f => f.name === 'image').widget, 'image');
  assert.equal(courses.fields.find(f => f.name === 'gallery').allow_reorder, true);
});

test('Google Scholar link remains visible when CMS rebuilds publication entries', async () => {
  const copy = structuredClone(data);
  copy.publications.unshift({ category: 'journal', year: 2027, title: 'New publication', citation: 'Complete new citation' });
  const page = doc(await renderPage('publications.html', root, copy));
  const link = page.querySelector('.page-intro .scholar-link');
  assert.ok(link);
  const url = new URL(link.getAttribute('href'));
  assert.equal(url.origin, 'https://scholar.google.com');
  assert.equal(url.searchParams.get('user'), '5a0ZdAgAAAAJ');
  assert.equal(url.searchParams.get('hl'), 'en');
  assert.equal(link.getAttribute('target'), '_blank');
  assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
  assert.match(page.querySelector('.publication-section li').textContent, /Complete new citation/);
});
