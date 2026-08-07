import { describe, expect, it } from 'vitest';
import { isMacUserAgent, matchNativeMacShortcut } from './native-shortcuts';

function shortcutEvent(
  code: string,
  overrides: Partial<Parameters<typeof matchNativeMacShortcut>[0]> = {},
) {
  return {
    altKey: true,
    code,
    ctrlKey: true,
    isComposing: false,
    metaKey: false,
    repeat: false,
    shiftKey: false,
    ...overrides,
  };
}

describe('native macOS shortcuts', () => {
  it('maps Control+Option+M and H', () => {
    expect(matchNativeMacShortcut(shortcutEvent('KeyM'))).toBe('model');
    expect(matchNativeMacShortcut(shortcutEvent('KeyH'))).toBe('reasoning');
    expect(matchNativeMacShortcut(shortcutEvent('KeyH', { repeat: true }))).toBe('reasoning');
  });

  it('ignores partial or ambiguous modifier combinations', () => {
    expect(matchNativeMacShortcut(shortcutEvent('KeyM', { altKey: false }))).toBeUndefined();
    expect(matchNativeMacShortcut(shortcutEvent('KeyM', { metaKey: true }))).toBeUndefined();
    expect(matchNativeMacShortcut(shortcutEvent('KeyH', { shiftKey: true }))).toBeUndefined();
    expect(matchNativeMacShortcut(shortcutEvent('KeyH', { isComposing: true }))).toBeUndefined();
  });

  it('recognizes Apple user agents without relying on optional extension APIs', () => {
    expect(isMacUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(true);
    expect(isMacUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    expect(isMacUserAgent(undefined)).toBe(false);
  });
});
