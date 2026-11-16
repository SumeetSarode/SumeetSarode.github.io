/**
 * The preview page: shows the build status, reloads the site when a new build is ready
 * (staying on the same page), and keeps the local server alive while the tab is open.
 */
import { startImportPanel } from '/__preview/import.js';

const $ = (id) => document.getElementById(id);
const frame = $('site');
const LABELS = { building: 'Updating…', ready: 'Up to date', error: 'Needs a fix' };

let shownVersion = 0;

function showResume(resume) {
  const line = $('resume');
  line.dataset.state = resume.state;
  line.textContent = resume.message;
  if (resume.state === 'ready') {
    const link = document.createElement('a');
    link.href = '/resume/resume.pdf';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open the PDF';
    line.append(' ', link);
  }
}

function showList(section, list, items) {
  section.hidden = items.length === 0;
  list.replaceChildren(
    ...items.map((text) => Object.assign(document.createElement('li'), { textContent: text })),
  );
}

function show(status) {
  const { site } = status;
  $('dot').dataset.state = site.state;
  $('site-state').textContent = LABELS[site.state] ?? site.state;
  $('site-message').textContent =
    site.state === 'error'
      ? 'See below.'
      : site.state === 'ready' && status.builtAt
        ? `· updated ${new Date(status.builtAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
        : site.message;
  $('problem').hidden = site.state !== 'error';
  $('problem-text').textContent = site.state === 'error' ? site.message : '';
  showResume(status.resume);
  showList($('warnings'), $('warning-list'), status.warnings);

  if (status.hasSite && status.version !== shownVersion) {
    if (shownVersion === 0) {
      frame.src = '/';
      frame.hidden = false;
      $('waiting').hidden = true;
    } else {
      frame.contentWindow?.location.reload(); // stay on the page being looked at
    }
    shownVersion = status.version;
  }
}

const refreshImport = startImportPanel();
const events = new EventSource('/__preview/events');
events.onmessage = (message) => {
  show(JSON.parse(message.data));
  refreshImport(); // a dropped download or a saved file may change what could be imported
};

/* ---------- desktop / phone width ---------- */
for (const button of document.querySelectorAll('[data-width]')) {
  button.addEventListener('click', () => {
    for (const other of document.querySelectorAll('[data-width]')) {
      other.setAttribute('aria-pressed', String(other === button));
    }
    const { width } = button.dataset;
    frame.style.maxWidth = width === 'full' ? '' : `${width}px`;
  });
}

/* ---------- keep-alive and quit (same rules as Photo Studio) ---------- */
const ping = () => fetch('/__preview/api/ping', { method: 'POST' }).catch(() => {});
ping();
setInterval(ping, 20_000);
window.addEventListener('pagehide', () => navigator.sendBeacon('/__preview/api/closing'));

$('quit').addEventListener('click', async () => {
  events.close();
  await fetch('/__preview/api/quit', { method: 'POST' }).catch(() => {});
  document.querySelector('.bar').hidden = true;
  $('stage').hidden = true;
  $('problem').hidden = true;
  $('warnings').hidden = true;
  $('import-panel').hidden = true;
  $('stopped').hidden = false;
});
