import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SwitchResult } from '../../domain/switching';
import { OverlayController } from './overlay-controller';

afterEach(() => {
  vi.useRealTimers();
});

describe('OverlayController', () => {
  it('keeps the overlay mounted while the close animation runs', () => {
    vi.useFakeTimers();
    const controller = new OverlayController(1_800, 150);
    controller.showPending('model');

    controller.hide();

    expect(controller.getSnapshot()).toMatchObject({ visible: true, closing: true });
    vi.advanceTimersByTime(149);
    expect(controller.getSnapshot()).toMatchObject({ visible: true, closing: true });
    vi.advanceTimersByTime(1);
    expect(controller.getSnapshot()).toEqual({ visible: false });
  });

  it('cancels a pending close when a new state is shown', () => {
    vi.useFakeTimers();
    const controller = new OverlayController(1_800, 150);
    controller.showPending('model');
    controller.hide();

    controller.showPreview(result(), false);
    vi.advanceTimersByTime(150);

    expect(controller.getSnapshot()).toMatchObject({
      visible: true,
      closing: false,
      kind: 'preview',
    });
  });

  it('keeps a held unavailable state visible until the shortcut is released', () => {
    vi.useFakeTimers();
    const controller = new OverlayController(1_800, 150);

    controller.showUnavailable('o3', false);
    vi.advanceTimersByTime(3_000);
    expect(controller.getSnapshot()).toMatchObject({
      visible: true,
      closing: false,
      kind: 'unavailable',
      modelName: 'o3',
    });

    controller.hide();
    vi.advanceTimersByTime(150);
    expect(controller.getSnapshot()).toEqual({ visible: false });
  });
});

function result(): SwitchResult {
  return {
    siteId: 'fake',
    siteName: 'Fake',
    target: 'model',
    current: 'Beta',
    previous: 'Alpha',
    changed: true,
    options: [{ id: 'beta', label: 'Beta', selected: true }],
    observedAt: 1,
  };
}
