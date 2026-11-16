// Decorate the pinned Decap 3.17.1 sidebar without replacing its React links.
// Native routes, unsaved-change prompts, search and the GitHub backend stay intact.
export const PAGE_ORDER = ['home', 'research', 'teaching', 'current', 'undergraduates', 'alumni', 'publications', 'news', 'contact'];
const people = ['current', 'undergraduates', 'alumni'];

export function installPageNavigation({ window, document }) {
  let stopped = false;
  function refresh() {
    if (stopped) return;
    for (const sidebar of document.querySelectorAll('aside')) {
      const current = sidebar.querySelector('a[data-testid="current"]');
      const list = current?.parentElement?.parentElement;
      if (!list || list.tagName !== 'UL' || !sidebar.querySelector('a[data-testid="undergraduates"]') || !sidebar.querySelector('a[data-testid="alumni"]')) continue;
      if (!sidebar.classList.contains('ssail-pages-sidebar')) sidebar.classList.add('ssail-pages-sidebar');
      for (const name of people) {
        const link = list.querySelector(`a[data-testid="${name}"]`);
        if (!link.parentElement.classList.contains('ssail-people-child')) link.parentElement.classList.add('ssail-people-child');
        const label = `People: ${link.textContent.trim()}`;
        if (link.getAttribute('aria-label') !== label) link.setAttribute('aria-label', label);
      }
      if (!list.querySelector('.ssail-people-heading')) {
        const heading = document.createElement('li');
        heading.className = 'ssail-people-heading';
        heading.innerHTML = '<h3>People</h3>';
        list.insertBefore(heading, current.parentElement);
      }
    }
  }
  const observer = new window.MutationObserver(refresh);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', refresh);
  refresh();
  return { refresh, destroy() {
    stopped = true; observer.disconnect(); window.removeEventListener('hashchange', refresh);
    document.querySelectorAll('.ssail-people-heading').forEach(n => n.remove());
    document.querySelectorAll('.ssail-people-child').forEach(n => n.classList.remove('ssail-people-child'));
    document.querySelectorAll('.ssail-pages-sidebar a[data-testid]').forEach(n => { if (n.getAttribute('aria-label')?.startsWith('People: ')) n.removeAttribute('aria-label'); });
    document.querySelectorAll('.ssail-pages-sidebar').forEach(n => n.classList.remove('ssail-pages-sidebar'));
  } };
}
