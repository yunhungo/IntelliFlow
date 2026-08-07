import { describe, expect, it, vi } from 'vitest';
import type { SiteAdapter } from '../adapters/site-adapter';
import { AdapterError } from '../adapters/site-adapter';
import type { SwitchResult, SwitchSnapshot, SwitchTarget } from '../domain/switching';
import { type OverlayPort, SwitchCoordinator } from './switch-coordinator';

describe('SwitchCoordinator', () => {
  it('serializes rapid switch requests', async () => {
    let active = 0;
    let maxActive = 0;
    let counter = 0;
    const adapter = fakeAdapter(async (target) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      counter += 1;
      active -= 1;
      return result(target, `value-${counter}`);
    });
    const overlay: OverlayPort = {
      showPending: vi.fn(),
      showPreview: vi.fn(),
      showResult: vi.fn(),
      showUnavailable: vi.fn(),
      showError: vi.fn(),
      hide: vi.fn(),
    };
    const coordinator = new SwitchCoordinator(adapter, overlay);

    const responses = await Promise.all([
      coordinator.handle({ type: 'intelliflow:switch', target: 'model' }),
      coordinator.handle({ type: 'intelliflow:switch', target: 'model' }),
      coordinator.handle({ type: 'intelliflow:switch', target: 'model' }),
    ]);

    expect(maxActive).toBe(1);
    expect(responses.every((response) => response.ok)).toBe(true);
    expect(overlay.showPending).toHaveBeenCalledTimes(3);
    expect(overlay.showResult).toHaveBeenCalledTimes(3);
  });

  it('cancels queued requests and suppresses late overlays', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let calls = 0;
    const adapter = fakeAdapter(async (target) => {
      calls += 1;
      if (calls === 1) await firstBlocked;
      return result(target, `value-${calls}`);
    });
    const overlay: OverlayPort = {
      showPending: vi.fn(),
      showPreview: vi.fn(),
      showResult: vi.fn(),
      showUnavailable: vi.fn(),
      showError: vi.fn(),
      hide: vi.fn(),
    };
    const coordinator = new SwitchCoordinator(adapter, overlay);

    const first = coordinator.handle({ type: 'intelliflow:switch', target: 'model' });
    const queued = coordinator.handle({ type: 'intelliflow:switch', target: 'model' });
    await Promise.resolve();
    coordinator.cancelPending();
    releaseFirst?.();

    const responses = await Promise.all([first, queued]);
    expect(responses.every((response) => !response.ok && response.code === 'cancelled')).toBe(true);
    expect(calls).toBe(1);
    expect(overlay.showResult).not.toHaveBeenCalled();
    expect(overlay.showError).not.toHaveBeenCalled();
  });

  it('refreshes reasoning only after the model actually changes', async () => {
    let currentModel = 'Alpha';
    const observe = vi.fn(async (target: SwitchTarget) =>
      snapshot(target, target === 'model' ? currentModel : 'High'),
    );
    const cycle = vi
      .fn<(target: SwitchTarget) => Promise<SwitchResult>>()
      .mockResolvedValueOnce({ ...result('model', 'Alpha'), changed: false })
      .mockImplementationOnce(async () => {
        currentModel = 'Beta';
        return result('model', currentModel);
      });
    const adapter: SiteAdapter = {
      id: 'fake',
      name: 'Fake',
      matches: () => true,
      readCurrent: vi.fn(async () => currentModel),
      observe,
      cycle,
      select: async (target) => result(target, 'selected'),
    };
    const overlay: OverlayPort = {
      showPending: vi.fn(),
      showPreview: vi.fn(),
      showResult: vi.fn(),
      showUnavailable: vi.fn(),
      showError: vi.fn(),
      hide: vi.fn(),
    };
    const coordinator = new SwitchCoordinator(adapter, overlay);

    await coordinator.handle({ type: 'intelliflow:read-state' });
    await coordinator.handle({ type: 'intelliflow:read-state' });
    expect(observe.mock.calls.map(([target]) => target)).toEqual(['model', 'reasoning']);

    await coordinator.handle({ type: 'intelliflow:switch', target: 'model' });
    await coordinator.handle({ type: 'intelliflow:read-state' });
    expect(observe.mock.calls.map(([target]) => target)).toEqual(['model', 'reasoning']);

    await coordinator.handle({ type: 'intelliflow:switch', target: 'model' });
    await coordinator.handle({ type: 'intelliflow:read-state' });
    expect(observe.mock.calls.map(([target]) => target)).toEqual([
      'model',
      'reasoning',
      'reasoning',
    ]);
  });

  it('returns model state when reasoning is unavailable', async () => {
    const adapter = fakeAdapter(async (target) => result(target, 'current'));
    adapter.observe = vi.fn(async (target) => {
      if (target === 'reasoning') {
        throw new AdapterError('Reasoning is unavailable.', 'target-unavailable');
      }
      return snapshot(target, 'o3');
    });
    const overlay = fakeOverlay();
    const coordinator = new SwitchCoordinator(adapter, overlay);

    const response = await coordinator.handle({ type: 'intelliflow:read-state' });

    expect(
      response.ok && 'state' in response ? response.state.reasoning : 'missing',
    ).toBeUndefined();
    expect(overlay.showError).not.toHaveBeenCalled();
  });

  it('shows the current model as not adjustable for an unavailable reasoning command', async () => {
    const adapter = fakeAdapter(async () => {
      throw new AdapterError('Reasoning is unavailable.', 'target-unavailable');
    });
    adapter.readCurrent = vi.fn(async () => 'o3');
    const overlay = fakeOverlay();
    const coordinator = new SwitchCoordinator(adapter, overlay);

    const response = await coordinator.handle({
      type: 'intelliflow:switch',
      target: 'reasoning',
    });

    expect(response).toMatchObject({ ok: false, code: 'target-unavailable' });
    expect(overlay.showUnavailable).toHaveBeenCalledWith('o3');
    expect(overlay.hide).not.toHaveBeenCalled();
    expect(overlay.showError).not.toHaveBeenCalled();
  });
});

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

function fakeAdapter(cycle: (target: SwitchTarget) => Promise<SwitchResult>): SiteAdapter {
  return {
    id: 'fake',
    name: 'Fake',
    matches: () => true,
    readCurrent: async () => 'current',
    observe: async (target) => snapshot(target, 'current'),
    cycle,
    select: async (target) => result(target, 'selected'),
  };
}

function snapshot(target: SwitchTarget, current: string): SwitchSnapshot {
  return {
    siteId: 'fake',
    siteName: 'Fake',
    target,
    current,
    options: [{ id: current, label: current, selected: true }],
    observedAt: 1,
  };
}

function result(target: SwitchTarget, current: string): SwitchResult {
  return { ...snapshot(target, current), previous: 'previous', changed: true };
}
