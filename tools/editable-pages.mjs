function string(value, label, required = false) {
  if (value == null && !required) return;
  if (typeof value !== 'string' || required && !value.trim()) throw new Error('Invalid ' + label);
}
function list(value, key) {
  if (value[key] == null) value[key] = [];
  if (!Array.isArray(value[key])) throw new Error('Invalid ' + key + ' list');
  return value[key];
}
export function youtubeEmbed(value) {
  if (typeof value !== 'string') throw new Error('Invalid YouTube URL');
  let url; try { url = new URL(value); } catch { throw new Error('Enter a YouTube watch, share or embed URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Unsafe YouTube URL');
  let id;
  if (['youtu.be', 'www.youtu.be'].includes(url.hostname)) id = url.pathname.slice(1);
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1];
  }
  if (!/^[\w-]{11}$/.test(id || '')) throw new Error('Enter a valid YouTube video URL.');
  return `https://www.youtube.com/embed/${id}`;
}
export function validatePageContent(kind, value, safeUrl) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid ' + kind + ' data');
  string(value.title, kind + ' title', true);
  if (kind === 'home') {
    for (const key of ['affiliation', 'intro', 'intro_ko', 'background_alt']) string(value[key], key);
    safeUrl(value.background, true); string(value.research_label, 'research area heading', true);
    for (const area of list(value, 'areas')) { string(area.title, 'research area title', true); string(area.body, 'research area description'); }
  } else if (kind === 'research') {
    string(value.eyebrow, 'section label'); string(value.intro, 'research introduction');
    for (const section of list(value, 'sections')) {
      string(section.title, 'research group heading');
      for (const item of list(section, 'items')) {
        if (!['feature', 'research'].includes(item.layout)) throw new Error('Invalid research card layout');
        for (const key of ['title', 'body', 'image_alt', 'video_title']) string(item[key], key);
        if (item.image) safeUrl(item.image, true);
        if (item.video_url) youtubeEmbed(item.video_url);
        if (item.image && item.video_url) throw new Error('Choose an image or a video for each research card.');
        if (![item.title, item.body, item.image, item.video_url].some(v => typeof v === 'string' && v.trim())) throw new Error('A research card needs a heading, description, image or video.');
      }
    }
  } else if (kind === 'contact') {
    string(value.eyebrow, 'section label');
    string(value.map_query, 'map location', true); string(value.map_title, 'map description', true);
    if (!Number.isInteger(value.map_zoom) || value.map_zoom < 1 || value.map_zoom > 20) throw new Error('Invalid map zoom');
    for (const office of list(value, 'offices')) {
      string(office.title, 'office heading', true); string(office.english, 'English address'); string(office.korean, 'Korean address');
      if (!office.english?.trim() && !office.korean?.trim()) throw new Error('An office needs an address.');
    }
  } else throw new Error('Unknown editable page');
  return value;
}
export function renderEditablePage(file, document, data, { escape, safeUrl, richHtml }) {
  const set = (selector, value) => { const node = document.querySelector(selector); if (!node) throw new Error('Missing ' + selector + ' in ' + file); node.innerHTML = value; };
  const plain = (selector, value) => { const node = document.querySelector(selector); if (!node) throw new Error('Missing ' + selector); node.textContent = value || ''; };
  const intro = value => `<p class="eyebrow">${escape(value.eyebrow || '')}</p><h1 class="page-title">${escape(value.title)}</h1>${value.intro ? `<p class="page-description">${escape(value.intro)}</p>` : ''}`;
  if (file === 'index.html' && data.home) {
    const home = data.home;
    plain('.hero h1', home.title); plain('.hero-copy', home.intro); plain('.hero-ko', home.intro_ko);
    set('.hero-affiliation', (home.affiliation || '').split(/\r?\n/).map(line => `<span>${escape(line)}</span>`).join(''));
    for (const selector of ['.hero-base', '.hero-lens']) document.querySelector(selector).setAttribute('src', safeUrl(home.background, true));
    document.querySelector('.hero-base').setAttribute('alt', home.background_alt || '');
    plain('.research-areas .eyebrow', home.research_label);
    set('.area-grid', home.areas.map(area => `<article class="area-card"><h3>${escape(area.title)}</h3><p>${escape(area.body || '')}</p></article>`).join('\n'));
  }
  if (file === 'research.html' && data.research) {
    set('.page-intro', intro(data.research));
    set('.page-content', data.research.sections.map(section => {
      const heading = section.title ? `<h2 class="section-heading">${escape(section.title).replace(/\r?\n/g, '<br>')}</h2>` : '';
      const renderItem = item => {
        const media = item.image ? `<img src="${escape(safeUrl(item.image, true))}" alt="${escape(item.image_alt || '')}">` : item.video_url ? `<div class="media-frame"><iframe loading="lazy" src="${escape(youtubeEmbed(item.video_url))}" title="${escape(item.video_title || item.title || 'Research video')}" allowfullscreen></iframe></div>` : '<div></div>';
        const classes = item.layout === 'feature' ? 'feature-card panel' + (!item.title ? ' research-lead' : '') : 'research-card panel';
        return `<article class="${classes}">${media}<div class="research-copy">${item.title ? `<h2>${escape(item.title)}</h2>` : ''}${richHtml(item.body)}</div></article>`;
      };
      let cards = '', pending = [];
      const flush = () => { if (pending.length) { cards += `<div class="research-list">${pending.join('\n')}</div>`; pending = []; } };
      for (const item of section.items) {
        if (item.layout === 'feature') { flush(); cards += renderItem(item); }
        else pending.push(renderItem(item));
      }
      flush();
      return heading + cards;
    }).join('\n') || '<p>Research information will be announced soon.</p>');
  }
  if (file === 'contact.html' && data.contact) {
    const contact = data.contact;
    const address = value => escape(value || '').replace(/\r?\n/g, '<br>');
    set('.page-intro', intro(contact));
    set('.address-list', contact.offices.map(office => `<article class="address-card panel"><h2>${escape(office.title)}</h2>${office.english ? `<p>${address(office.english)}</p>` : ''}${office.korean ? `<p>${address(office.korean)}</p>` : ''}</article>`).join('\n'));
    const iframe = document.querySelector('.map-frame iframe');
    iframe.setAttribute('src', `https://maps.google.com/maps?q=${encodeURIComponent(contact.map_query)}&z=${contact.map_zoom}&output=embed`);
    iframe.setAttribute('title', contact.map_title);
  }
}
