import {
  MIN_CROP_SIZE,
  clampCrop,
  maxCropSize,
  normalizeRotation,
  rotatePoint,
} from './crop-math.mjs';

import { DEFAULT_FILTERS, applyFilters } from './filters.mjs';

let filters = { ...DEFAULT_FILTERS };
const $ = (id) => document.getElementById(id);
const stage = $('stage');
const stageCanvas = $('stage-canvas');
const status = $('status');
const inputs = {
  zoom: $('zoom'),
  fine: $('fine'),
  cx: $('num-cx'),
  cy: $('num-cy'),
  size: $('num-size'),
  rotation: $('num-rotation'),
  alt: $('alt'),
};
const previewIds = ['p-light-160', 'p-light-64', 'p-dark-160', 'p-dark-64'];
const frameCanvases = [stageCanvas, ...previewIds.map($), $('confirm-preview')];

/** The page's photo frame. The page decides the shape; this editor follows it. */
let frame = { aspect: 1, ratioWidth: 1, ratioHeight: 1, outputWidth: 0, outputHeight: 0 };
let savedAlt = '';

/** Makes every canvas, and the crop guide, the same shape as the page's frame. */
function applyFrame(next) {
  frame = next;
  document.documentElement.style.setProperty(
    '--frame-ratio',
    `${frame.ratioWidth} / ${frame.ratioHeight}`,
  );
  // The page's frame has gently rounded corners; show the same shape here.
  document.documentElement.style.setProperty(
    '--frame-radius',
    `8% / ${(8 / frame.aspect).toFixed(2)}%`,
  );
  for (const canvas of frameCanvases) canvas.height = Math.round(canvas.width * frame.aspect);
  $('frame-note').textContent =
    `Your portfolio shows this photo in a ${frame.ratioWidth}:${frame.ratioHeight} frame. ` +
    `The saved picture is ${frame.outputWidth} x ${frame.outputHeight} pixels.`;
}

try {
  const state = await fetch('/api/state').then((response) => response.json());
  savedAlt = state.alt ?? '';
  applyFrame(state.frame);
} catch {
  status.textContent = 'Photo Studio could not read the photo frame. Open the app again.';
  status.classList.add('error');
}

/** @type {{ id: string, image: HTMLImageElement, width: number, height: number, crop: object } | null} */
let photo = null;

function say(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

/* ---------- rendering ---------- */

function drawCrop(canvas) {
  const ctx = canvas.getContext('2d');
  const { cx, cy, size, rotation } = photo.crop;
  const scale = canvas.width / size;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  ctx.drawImage(photo.image, 0, 0);
  ctx.restore();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyFilters(imageData.data, 4, filters);
  ctx.putImageData(imageData, 0, 0);
}

function render() {
  drawCrop(stageCanvas);
  for (const id of previewIds) {
    const canvas = $(id);
    canvas.getContext('2d').drawImage(stageCanvas, 0, 0, canvas.width, canvas.height);
  }
}

function syncControls() {
  const { crop, width, height } = photo;
  const maxSize = maxCropSize(width, height, crop.rotation, frame.aspect);
  inputs.zoom.max = String(Math.max(1.01, maxSize / MIN_CROP_SIZE));
  inputs.zoom.value = String(maxSize / crop.size);
  inputs.fine.value = String(crop.rotation - Math.round(crop.rotation / 90) * 90);
  inputs.cx.value = String(Math.round(crop.cx));
  inputs.cy.value = String(Math.round(crop.cy));
  inputs.size.value = String(Math.round(crop.size));
  inputs.rotation.value = String(Math.round(crop.rotation * 10) / 10);
}

/** Every change goes through here, so the crop is always valid. */
function update(changes) {
  photo.crop = clampCrop({ ...photo.crop, ...changes }, photo.width, photo.height, frame.aspect);
  syncControls();
  render();
}

function resetCrop() {
  update({ cx: photo.width / 2, cy: photo.height / 2, size: Infinity, rotation: 0 });
}

/* ---------- gestures ---------- */

/** Moves the crop window by (dx, dy) in the upright view, converted to source pixels. */
function moveWindow(dx, dy) {
  const delta = rotatePoint(dx, dy, -photo.crop.rotation);
  update({ cx: photo.crop.cx + delta.x, cy: photo.crop.cy + delta.y });
}

function zoomBy(factor) {
  update({ size: photo.crop.size / factor });
}

let drag = null;
stageCanvas.addEventListener('pointerdown', (event) => {
  if (!photo) return;
  stageCanvas.setPointerCapture(event.pointerId);
  drag = { x: event.clientX, y: event.clientY };
  stage.focus();
});
stageCanvas.addEventListener('pointermove', (event) => {
  if (!drag || !photo) return;
  const rect = stageCanvas.getBoundingClientRect();
  const perPixel = photo.crop.size / rect.width;
  // Dragging the photo right moves the window left over it.
  moveWindow(-(event.clientX - drag.x) * perPixel, -(event.clientY - drag.y) * perPixel);
  drag = { x: event.clientX, y: event.clientY };
});
for (const type of ['pointerup', 'pointercancel'])
  stageCanvas.addEventListener(type, () => (drag = null));

stage.addEventListener('keydown', (event) => {
  if (!photo) return;
  const step = photo.crop.size * (event.shiftKey ? 0.1 : 0.02);
  const actions = {
    ArrowLeft: () => moveWindow(-step, 0),
    ArrowRight: () => moveWindow(step, 0),
    ArrowUp: () => moveWindow(0, -step),
    ArrowDown: () => moveWindow(0, step),
    '+': () => zoomBy(1.05),
    '=': () => zoomBy(1.05),
    '-': () => zoomBy(1 / 1.05),
    '[': () => update({ rotation: photo.crop.rotation - 1 }),
    ']': () => update({ rotation: photo.crop.rotation + 1 }),
  };
  const action = actions[event.key];
  if (!action) return;
  event.preventDefault();
  action();
});

/* ---------- controls ---------- */

inputs.zoom.addEventListener('input', () => {
  update({
    size:
      maxCropSize(photo.width, photo.height, photo.crop.rotation, frame.aspect) /
      Number(inputs.zoom.value),
  });
});
inputs.fine.addEventListener('input', () => {
  const quarter = Math.round(photo.crop.rotation / 90) * 90;
  update({ rotation: quarter + Number(inputs.fine.value) });
});
$('rotate-left').addEventListener('click', () =>
  update({ rotation: normalizeRotation(photo.crop.rotation - 90) }),
);
$('rotate-right').addEventListener('click', () =>
  update({ rotation: normalizeRotation(photo.crop.rotation + 90) }),
);
// The four numbers are applied together: applying them one at a time would
// clamp each against the old crop, so the result would depend on typing order.
$('values-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const wanted = {};
  for (const key of ['cx', 'cy', 'size', 'rotation']) {
    wanted[key] = Number(inputs[key].value);
    if (inputs[key].value.trim() === '' || !Number.isFinite(wanted[key])) {
      return say(`Enter a number for ${key}.`, true);
    }
  }
  update(wanted);
  const { crop } = photo;
  const adjusted = ['cx', 'cy', 'size', 'rotation'].some(
    (key) => Math.abs(crop[key] - wanted[key]) > 0.5,
  );
  say(adjusted ? 'Values adjusted so the crop stays inside the photo.' : 'Values applied.');
});
$('reset').addEventListener('click', () => {
  resetCrop();
  say('Crop reset.');
});

function resetFilters() {
  filters = { ...DEFAULT_FILTERS };
  for (const key of ['brightness', 'contrast', 'saturation']) {
    $(key).value = '100';
    $(`${key}-value`).textContent = '100%';
  }
  $('grayscale').checked = false;
  if (photo) render();
}
for (const key of ['brightness', 'contrast', 'saturation']) {
  $(key).addEventListener('input', () => {
    filters[key] = Number($(key).value);
    $(`${key}-value`).textContent = `${filters[key]}%`;
    render();
  });
}
$('grayscale').addEventListener('change', () => {
  filters.grayscale = $('grayscale').checked;
  render();
});
$('reset-filters').addEventListener('click', resetFilters);

/* ---------- server calls ---------- */

async function post(path, body, isJson = true) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: isJson ? { 'Content-Type': 'application/json' } : {},
      body: isJson ? JSON.stringify(body) : body,
    });
  } catch {
    throw new Error('Photo Studio has stopped. Open the Photo Studio app again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'Something went wrong.');
  return data;
}

/* ---------- keep-alive and quit ---------- */

// The app stops by itself when the tab is closed. While this page is open it
// checks in regularly, and tells the app when it is being closed.
const ping = () => fetch('/api/ping', { method: 'POST' }).catch(() => {});
ping();
setInterval(ping, 20_000);
window.addEventListener('pagehide', () => navigator.sendBeacon('/api/closing'));

$('quit').addEventListener('click', async () => {
  await fetch('/api/quit', { method: 'POST' }).catch(() => {});
  $('picker').hidden = true;
  $('editor').hidden = true;
  $('quit').hidden = true;
  $('closed').hidden = false;
  say('');
});

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The photo could not be displayed.'));
    image.src = url;
  });
}

async function openFile(file) {
  say('Reading photo...');
  try {
    const { id, width, height } = await post('/api/decode', file, false);
    const image = await loadImage(`/api/image/${id}`);
    photo = { id, image, width, height, crop: { cx: 0, cy: 0, size: 1, rotation: 0 } };
    $('picker').hidden = true;
    $('editor').hidden = false;
    resetFilters();
    resetCrop();
    stage.focus();
    say(`Photo loaded (${width} x ${height}). Frame your head and shoulders, then save.`);
  } catch (error) {
    say(error.message, true);
  }
}

async function showPicker() {
  photo = null;
  $('editor').hidden = true;
  $('picker').hidden = false;
  $('file').value = '';
}

const confirmDialog = $('confirm-dialog');
$('save').addEventListener('click', () => {
  if (!inputs.alt.value.trim()) {
    say('Add alt text before confirming your photo.', true);
    inputs.alt.focus();
    return;
  }
  drawCrop($('confirm-preview'));
  $('confirm-error').textContent = '';
  confirmDialog.showModal();
});
$('back-to-edit').addEventListener('click', () => confirmDialog.close());

$('confirm-save').addEventListener('click', async () => {
  const button = $('confirm-save');
  button.disabled = true;
  say('Saving...');
  try {
    const { crop } = photo;
    await post('/api/save', { id: photo.id, ...crop, filters, alt: inputs.alt.value });
    confirmDialog.close();
    await showPicker();
    $('file').focus();
    say('Portfolio photo updated locally. Commit and push to publish it to your live website.');
  } catch (error) {
    $('confirm-error').textContent = error.message;
    say(error.message, true);
  } finally {
    button.disabled = false;
  }
});

$('cancel').addEventListener('click', async () => {
  const id = photo?.id;
  await showPicker();
  if (id) await post('/api/cancel', { id }).catch(() => {});
  say('Cancelled. Nothing was changed.');
});

/* ---------- picking a file ---------- */

$('file').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) openFile(file);
});
const dropzone = $('dropzone');
for (const type of ['dragenter', 'dragover']) {
  dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    dropzone.classList.add('is-over');
  });
}
for (const type of ['dragleave', 'drop']) {
  dropzone.addEventListener(type, () => dropzone.classList.remove('is-over'));
}
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  const [file] = event.dataTransfer.files;
  if (file) openFile(file);
});

inputs.alt.value = savedAlt;
