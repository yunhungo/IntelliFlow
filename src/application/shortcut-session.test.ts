import { describe, expect, it, vi } from 'vitest';
import type { SiteAdapter } from '../adapters/site-adapter';
import { AdapterError } from '../adapters/site-adapter';
import type { SwitchResult, SwitchSnapshot, SwitchTarget } from '../domain/switching';
import { ShortcutSessionCoordinator } from './shortcut-session';
import type { OverlayPort } from './switch-coordinator';

describe('ShortcutSessionCoordinator', () => {
  it('cycles locally and applies only once when a modifier is released', async () => {
    const adapter = fakeAdapter();
    const overlay = fakeOverlay();
    const coordinator = new ShortcutSessionCoordinator(adapter, overlay);

    coordinator.advance('model');
    await vi.waitFor(() => expect(overlay.showPreview).toHaveBeenCalled());
    expect(lastPreview(overlay).current).toBe('Beta');

    coordinator.advance('model');
    expect(lastPreview(overlay).current).toBe('Gamma');
    expect(adapter.select).not.toHaveBeenCalled();

    coordinator.release();
    await vi.waitFor(() => expect(adapter.select).toHaveBeenCalledOnce());
    expect(adapter.select).toHaveBeenCalledWith('model', 'gamma');
    expect(overlay.hide).toHaveBeenCalled();
    expect(overlay.showResult).not.toHaveBeenCalled();
  });

  it('commits after loading when the modifier was already released', async () => {
    const state = deferred<SwitchSnapshot>();
    const adapter = fakeAdapter(() => state.promise);
    const overlay = fakeOverlay();
    const coordinator = new ShortcutSessionCoordinator(adapter, overlay);

    coordinator.advance('reasoning');
    coordinator.release();
    expect(adapter.select).not.toHaveBeenCalled();

    state.resolve(snapshot('reasoning'));
    await vi.waitFor(() => expect(adapter.select).toHaveBeenCalledOnce());
    expect(adapter.select).toHaveBeenCalledWith('reasoning', 'beta');
    expect(overlay.hide).toHaveBeenCalled();
  });

  it('suppresses a late load after Escape cancels the session', async () => {
    const state = deferred<SwitchSnapshot>();
    const adapter = fakeAdapter(() => state.promise);
    const overlay = fakeOverlay();
    const coordinator = new ShortcutSessionCoordinator(adapter, overlay);

    coordinator.advance('model');
    coordinator.cancel();
    state.resolve(snapshot('model'));
    await Promise.resolve();
    await Promise.resolve();

    expect(adapter.select).not.toHaveBeenCalled();
    expect(overlay.showPreview).not.toHaveBeenCalled();
    expect(overlay.hide).toHaveBeenCalled();
  });

  it('reuses the recent observed list for an instant second session', async () => {
    const adapter = fakeAdapter();
    const overlay = fakeOverlay();
    const coordinator = new ShortcutSessionCoordinator(adapter, overlay);

    coordinator.advance('model');
    await vi.waitFor(() => expect(overlay.showPreview).toHaveBeenCalled());
    coordinator.release();
    await vi.waitFor(() => expect(adapter.select).toHaveBeenCalledOnce());

    coordinator.advance('model');
    expect(adapter.observe).toHaveBeenCalledOnce();
    expect(lastPreview(overlay).current).toBe('Gamma');
  });

  it('closes without updating when selection returns to the original option', async () => {
    const adapter = fakeAdapter();
    const overlay = fakeOverlay();
    const coordinator = new ShortcutSessionCoordinator(adapter, overlay);

    coordinator.advance('model');
    await vi.waitFor(() => expect(overlay.showPreview).toHaveBeenCalled());
    coordinator.advance('model');
    coordinator.advance('model');
    expect(lastPreview(overlay).current).toBe('Alpha');

    coordinator.release();
    await Promise.resolve();

    expect(adapter.select).not.toHaveBeenCalled();
    expect(overlay.hide).toHaveBeenCalled();
  });

  it('closes immediately after a click and skips a click on the original option', async () => {
    const adapter = fakeAdapter();
    const overlay = fakeOverlay();
    const coordinator = new ShortcutSessionCoordinator(adapter, overlay);

    coordinator.advance('model');
    await vi.waitFor(() => expect(overlay.showPreview).toHaveBeenCalled());
    expect(coordinator.select('model', 'alpha')).toBe(true);
    await Promise.resolve();

    expect(adapter.select).not.toHaveBeenCalled();
    expect(overlay.hide).toHaveBeenCalled();
  });

  it('reloads reasoning options when the native model changed', async () => {
    const readCurrent = vi
      .fn<(target: SwitchTarget) => Promise<string>>()
      .mockResolvedValueOnce('GPT-5.6 Sol')
      .mockResolvedValueOnce('o3');
    const observe = vi
      .fn<(target: SwitchTarget) => Promise<SwitchSnapshot>>()
      .mockResolvedValueOnce(snapshot('reasoning'))
      .mockResolvedValueOnce(singleReasoningSnapshot());
    const adapter: SiteAdapter = {
      id: 'fake',
      name: 'Fake',
      matches: () => true,
      readCurrent,
      observe,
      cycle: vi.fn(async (target) => result(target, 'beta')),
      select: vi.fn(async (target, optionId) => result(target, optionId)),
    };
    const overlay = fakeOverlay();
    const coordinator = new ShortcutSessionCoordinator(adapter, overlay);

    coordinator.advance('reasoning');
    await vi.waitFor(() => expect(overlay.showPreview).toHaveBeenCalledTimes(1));
    coordinator.cancel();

    coordinator.advance('reasoning');
    await vi.waitFor(() => expect(overlay.showPreview).toHaveBeenCalledTimes(2));

    expect(observe).toHaveBeenCalledTimes(2);
    expect(lastPreview(overlay).options).toHaveLength(1);
    expect(lastPreview(overlay).current).toBe('Only');
  });

  it('shows the current model as not adjustable when it has no reasoning selector', async () => {
    const adapter = fakeAdapter(async () => {
      throw new AdapterError('Reasoning is unavailable.', 'target-unavailable');
    });
    adapter.readCurrent = vi.fn(async () => 'o3');
    const overlay = fakeOverlay();
    const coordinator = new ShortcutSessionCoordinator(adapter, overlay);

    coordinator.advance('reasoning');
    await vi.waitFor(() => expect(overlay.showUnavailable).toHaveBeenCalledWith('o3', false));

    expect(overlay.showPending).not.toHaveBeenCalled();
    expect(overlay.showPreview).not.toHaveBeenCalled();
    expect(overlay.showError).not.toHaveBeenCalled();
    expect(overlay.hide).toHaveBeenCalledOnce();

    vi.mocked(overlay.hide).mockClear();
    coordinator.release();
    expect(overlay.hide).toHaveBeenCalledOnce();
  });
});

function fakeAdapter(
  observe: (target: SwitchTarget) => Promise<SwitchSnapshot> = async (target) => snapshot(target),
): SiteAdapter {
  return {
    id: 'fake',
    name: 'Fake',
    matches: () => true,
    readCurrent: vi.fn(async () => 'GPT-5.6 Sol'),
    observe: vi.fn(observe),
    cycle: vi.fn(async (target) => result(target, 'beta')),
    select: vi.fn(async (target, optionId) => result(target, optionId)),
  };
}

function singleReasoningSnapshot(): SwitchSnapshot {
  return {
    siteId: 'fake',
    siteName: 'Fake',
    target: 'reasoning',
    current: 'Only',
    options: [{ id: 'only', label: 'Only', selected: true }],
    observedAt: 2,
  };
}

function fakeOverlay(): OverlayPort {
  return {
    showPending: vi.fn(),
    showPreview: vi.fn(),
    showResult: vi.fn(),
    showUnavailable: vi.fn(),
    showError: vi.fn(),
    hide: vi.fn(),
  };
}

function snapshot(target: SwitchTarget): SwitchSnapshot {
  return {
    siteId: 'fake',
    siteName: 'Fake',
    target,
    current: 'Alpha',
    options: [
      { id: 'alpha', label: 'Alpha', selected: true },
      { id: 'beta', label: 'Beta', selected: false },
      { id: 'gamma', label: 'Gamma', selected: false },
    ],
    observedAt: 1,
  };
}

function result(target: SwitchTarget, optionId: string): SwitchResult {
  const base = snapshot(target);
  const options = base.options.map((option) => ({ ...option, selected: option.id === optionId }));
  return {
    ...base,
    current: options.find((option) => option.selected)?.label ?? base.current,
    options,
    previous: base.current,
    changed: optionId !== 'alpha',
  };
}

function lastPreview(overlay: OverlayPort): SwitchResult {
  const calls = vi.mocked(overlay.showPreview).mock.calls;
  const result = calls.at(-1)?.[0];
  if (result == null) throw new Error('Expected a preview result.');
  return result;
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
} {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve(value) {
      resolvePromise?.(value);
    },
  };
}
