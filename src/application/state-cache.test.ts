import { describe, expect, it } from 'vitest';
import type { SwitchResult, SwitchSnapshot, SwitchTarget } from '../domain/switching';
import { SwitchStateCache } from './state-cache';

describe('SwitchStateCache', () => {
  it('keeps reasoning cached after the model cache expires', () => {
    let now = 0;
    const cache = new SwitchStateCache(30_000, () => now);
    cache.set(snapshot('model', 'Alpha'));
    cache.set(snapshot('reasoning', 'High'));

    now = 30_001;

    expect(cache.get('model')).toBeUndefined();
    expect(cache.get('reasoning')?.current).toBe('High');
  });

  it('keeps reasoning when a model action changes nothing', () => {
    const cache = new SwitchStateCache();
    cache.set(snapshot('model', 'Alpha'));
    cache.set(snapshot('reasoning', 'High'));

    cache.set(result('model', 'Alpha', false));

    expect(cache.get('reasoning')?.current).toBe('High');
  });

  it('invalidates reasoning when a model action changes the model', () => {
    const cache = new SwitchStateCache();
    cache.set(snapshot('model', 'Alpha'));
    cache.set(snapshot('reasoning', 'High'));

    cache.set(result('model', 'Beta', true));

    expect(cache.get('reasoning')).toBeUndefined();
  });

  it('invalidates reasoning when a refreshed model differs from the previous observation', () => {
    let now = 0;
    const cache = new SwitchStateCache(30_000, () => now);
    cache.set(snapshot('model', 'Alpha'));
    cache.set(snapshot('reasoning', 'High'));
    now = 30_001;

    cache.set(snapshot('model', 'Beta'));

    expect(cache.get('reasoning')).toBeUndefined();
  });

  it('invalidates reasoning when ChatGPT reports a different native model', () => {
    const cache = new SwitchStateCache();
    cache.set(snapshot('model', 'GPT-5.6 Sol'));
    cache.set(snapshot('reasoning', 'Pro'));

    cache.confirmModel('o3');

    expect(cache.get('model')).toBeUndefined();
    expect(cache.get('reasoning')).toBeUndefined();
  });

  it('caches an unavailable reasoning capability until the model changes', () => {
    const cache = new SwitchStateCache();
    cache.markReasoningUnavailable('o3');

    expect(cache.getUnavailableReasoningModel()).toBe('o3');

    cache.set(result('model', 'GPT-5.6 Sol', true));

    expect(cache.getUnavailableReasoningModel()).toBeUndefined();
  });

  it('clears an unavailable capability after reasoning options are observed', () => {
    const cache = new SwitchStateCache();
    cache.markReasoningUnavailable('o3');

    cache.set(snapshot('reasoning', 'High'));

    expect(cache.getUnavailableReasoningModel()).toBeUndefined();
    expect(cache.get('reasoning')?.current).toBe('High');
  });
});

function snapshot(target: SwitchTarget, current: string): SwitchSnapshot {
  return {
    siteId: 'fake',
    siteName: 'Fake',
    target,
    current,
    options: [{ id: current.toLowerCase(), label: current, selected: true }],
    observedAt: 1,
  };
}

function result(target: SwitchTarget, current: string, changed: boolean): SwitchResult {
  return { ...snapshot(target, current), previous: 'previous', changed };
}
