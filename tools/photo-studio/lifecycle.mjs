/**
 * Decides when the Photo Studio server should stop by itself, so a
 * double-clicked app never leaves a forgotten process running.
 *
 *  - start():   nobody opened the page in time          -> stop after `startMs`
 *  - ping():    the open page checks in every few secs  -> stop after `idleMs` of silence
 *  - closing(): the tab was closed (or is reloading)    -> stop after `graceMs`, unless a ping arrives
 *  - quit():    the user pressed "Quit"                 -> stop almost immediately
 */
export function createLifecycle({
  onShutdown,
  startMs = 2 * 60_000,
  idleMs = 10 * 60_000,
  graceMs = 30_000,
  quitMs = 150,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let timer;
  const arm = (ms) => {
    clearTimer(timer);
    timer = setTimer(onShutdown, ms);
  };
  return {
    start: () => arm(startMs),
    ping: () => arm(idleMs),
    closing: () => arm(graceMs),
    quit: () => arm(quitMs),
    stop: () => clearTimer(timer),
  };
}
