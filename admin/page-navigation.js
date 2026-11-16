// Keep the existing People data and native Decap editors behind one sidebar link.
export const PAGE_ORDER = ['home', 'research', 'teaching', 'current', 'undergraduates', 'alumni', 'publications', 'news', 'contact'];
export const PEOPLE_TYPES = [
  ['current', 'Current Members', 'Open Current Members below, add or edit members, then publish.'],
  ['undergraduates', 'Undergraduate Researchers', 'Open a year to add or edit students, or use New Year to create a year.'],
  ['alumni', 'Alumni', 'Open a school group to add or edit alumni, or create a new school group.']
];
export function peopleKindFromRoute(hash) {
  const name = hash.match(/^#\/collections\/([^/?]+)\/?(?:\?.*)?$/)?.[1];
  return PEOPLE_TYPES.some(([id]) => id === name) ? name : null;
}

export function installPageNavigation({ window, document }) {
  let stopped = false;
  function createSelector() {
    const group = document.createElement('div'); group.className = 'ssail-people-type';
    const label = document.createElement('label'); label.htmlFor = 'ssail-people-type'; label.textContent = 'Type';
    const select = document.createElement('select'); select.id = 'ssail-people-type';
    for (const [value, text] of PEOPLE_TYPES) {
      const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option);
    }
    const hint = document.createElement('p'); hint.id = 'ssail-people-type-hint';
    select.setAttribute('aria-describedby', hint.id);
    select.addEventListener('change', () => {
      // Never navigate away from an unsaved entry using a stale list selector.
      if (!peopleKindFromRoute(window.location.hash)) return refresh();
      if (PEOPLE_TYPES.some(([id]) => id === select.value)) window.location.hash = '#/collections/' + select.value;
      refresh();
    });
    group.append(label, select, hint);
    return group;
  }
  function refresh() {
    if (stopped) return;
    const kind = peopleKindFromRoute(window.location.hash);
    let visibleSelector;
    for (const sidebar of document.querySelectorAll('aside')) {
      const link = sidebar.querySelector('a[data-testid="current"]');
      if (!link) continue;
      // Use exactly the same native active class as other sidebar entries.
      if (link.classList.contains('sidebar-active') !== Boolean(kind)) link.classList.toggle('sidebar-active', Boolean(kind));
      if (kind && link.getAttribute('aria-current') !== 'page') link.setAttribute('aria-current', 'page');
      else if (!kind && link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
      const main = [...sidebar.parentElement.children].find(node => node.tagName === 'MAIN');
      if (!kind || !main) continue;
      const heading = main.querySelector('h1');
      // Decap 3.17.1 CollectionTop: main > card > row > h1.
      const card = heading?.parentElement?.parentElement;
      const host = card && card !== main && main.contains(card) ? card : main;
      visibleSelector = main.querySelector('.ssail-people-type');
      if (!visibleSelector) { visibleSelector = createSelector(); host.append(visibleSelector); }
      const select = visibleSelector.querySelector('select');
      if (select.value !== kind) select.value = kind;
      const hint = visibleSelector.querySelector('p');
      const text = PEOPLE_TYPES.find(([id]) => id === kind)[2];
      if (hint.textContent !== text) hint.textContent = text;
    }
    document.querySelectorAll('.ssail-people-type').forEach(node => { if (node !== visibleSelector) node.remove(); });
  }
  const observer = new window.MutationObserver(refresh);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', refresh);
  refresh();
  return { refresh, destroy() {
    stopped = true; observer.disconnect(); window.removeEventListener('hashchange', refresh);
    document.querySelectorAll('.ssail-people-type').forEach(node => node.remove());
    if (peopleKindFromRoute(window.location.hash) !== 'current') {
      document.querySelectorAll('aside a[data-testid="current"]').forEach(link => { link.classList.remove('sidebar-active'); link.removeAttribute('aria-current'); });
    }
  } };
}
