import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLifecycle } from '../../tools/photo-studio/lifecycle.mjs';

describe('photo studio lifecycle (auto-shutdown)', () => {
  let onShutdown: ReturnType<typeof vi.fn>;
  let lifecycle: ReturnType<typeof createLifecycle>;

  beforeEach(() => {
    vi.useFakeTimers();
    onShutdown = vi.fn();
    lifecycle = createLifecycle({
      onShutdown,
      startMs: 1000,
      idleMs: 5000,
      graceMs: 2000,
      quitMs: 50,
    });
  });
  afterEach(() => vi.useRealTimers());

  it('stops if nobody ever opens the page', () => {
    lifecycle.start();
    vi.advanceTimersByTime(999);
    expect(onShutdown).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onShutdown).toHaveBeenCalledTimes(1);
  });

  it('stays alive while the page keeps checking in', () => {
    lifecycle.start();
    lifecycle.ping(); // the page checks in the moment it loads
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(4000);
      lifecycle.ping();
    }
    expect(onShutdown).not.toHaveBeenCalled();
  });

  it('stops after the page goes silent', () => {
    lifecycle.ping();
    vi.advanceTimersByTime(5001);
    expect(onShutdown).toHaveBeenCalledTimes(1);
  });

  it('stops shortly after the tab closes', () => {
    lifecycle.ping();
    lifecycle.closing();
    vi.advanceTimersByTime(1999);
    expect(onShutdown).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onShutdown).toHaveBeenCalledTimes(1);
  });

  it('survives a page reload (closing, then an immediate ping)', () => {
    lifecycle.ping();
    lifecycle.closing();
    vi.advanceTimersByTime(300);
    lifecycle.ping();
    vi.advanceTimersByTime(4000);
    expect(onShutdown).not.toHaveBeenCalled();
  });

  it('stops almost immediately on Quit', () => {
    lifecycle.ping();
    lifecycle.quit();
    vi.advanceTimersByTime(51);
    expect(onShutdown).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled', () => {
    lifecycle.start();
    lifecycle.stop();
    vi.advanceTimersByTime(60_000);
    expect(onShutdown).not.toHaveBeenCalled();
  });
});
