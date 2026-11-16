/**
 * The "Import from LinkedIn" box: shows what the download could add, lets the owner tick items,
 * and sends back only the ticked ids. Everything shown is put on the page as plain text.
 */
const $ = (id) => document.getElementById(id);

const element = (tag, text, className) => {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
};

const KIND = { education: 'Degree', certification: 'Certificate', role: 'Job' };

let ticked = new Set();

function updateButton() {
  const count = ticked.size;
  $('import-add').disabled = count === 0;
  $('import-add').textContent = count === 0 ? 'Add selected' : `Add ${count} selected`;
}

function renderChange(change, index) {
  const id = `change-${index}`;
  const box = document.createElement('input');
  Object.assign(box, { type: 'checkbox', id, checked: ticked.has(change.id) });
  box.addEventListener('change', () => {
    if (box.checked) ticked.add(change.id);
    else ticked.delete(change.id);
    updateButton();
  });
  const label = document.createElement('label');
  label.htmlFor = id;
  label.append(
    element('span', KIND[change.kind] ?? 'New', 'kind'),
    element('strong', change.heading),
    ...change.details.map((line) => element('span', line, 'detail')),
  );
  const item = document.createElement('li');
  item.append(box, label);
  return item;
}

function fillList(listId, details, items) {
  $(details).hidden = items.length === 0;
  $(listId).replaceChildren(...items.map((text) => element('li', text)));
}

function render(result) {
  const changes = result.changes ?? [];
  ticked = new Set([...ticked].filter((id) => changes.some((change) => change.id === id)));
  $('import-message').textContent = result.message;
  $('import-message').dataset.state = result.state;
  $('import-form').hidden = changes.length === 0;
  $('import-list').replaceChildren(...changes.map(renderChange));
  fillList('import-already', 'import-already-box', result.already ?? []);
  fillList('import-notes', 'import-notes-box', result.notes ?? []);
  $('import-panel').dataset.state = result.state;
  updateButton();
}

async function refresh() {
  try {
    render(await (await fetch('/__preview/api/import')).json());
  } catch {
    /* The preview is closing; nothing to show. */
  }
}

async function addSelected() {
  const result = $('import-result');
  $('import-add').disabled = true;
  result.textContent = 'Adding…';
  const response = await fetch('/__preview/api/import/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: [...ticked] }),
  }).catch(() => undefined);
  const answer = await response?.json().catch(() => undefined);
  if (response?.ok) {
    ticked.clear();
    const n = answer.added;
    result.textContent =
      n === 0
        ? 'Nothing was added: those items are already on your site.'
        : `Added ${n} to ${answer.files.join(' and ')}. The preview is updating. Your old files are in content/linkedin/backup/.`;
  } else {
    result.textContent = answer?.error ?? 'That did not work. Nothing was saved.';
  }
  await refresh();
}

export function startImportPanel() {
  $('import-select-all').addEventListener('click', () => {
    for (const box of $('import-list').querySelectorAll('input')) {
      if (!box.checked) box.click();
    }
  });
  $('import-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (ticked.size > 0) addSelected();
  });
  refresh();
  return refresh;
}
