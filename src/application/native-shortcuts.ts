import type { SwitchTarget } from '../domain/switching';

export type ShortcutEvent = Pick<
  KeyboardEvent,
  'altKey' | 'code' | 'ctrlKey' | 'isComposing' | 'metaKey' | 'repeat' | 'shiftKey'
>;

export function matchNativeMacShortcut(event: ShortcutEvent): SwitchTarget | undefined {
  if (event.isComposing || !event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey) {
    return undefined;
  }

  if (event.code === 'KeyM') return 'model';
  if (event.code === 'KeyH') return 'reasoning';
  return undefined;
}

export function isMacUserAgent(userAgent: string | undefined): boolean {
  return /Macintosh|Mac OS X|iPhone|iPad|iPod/i.test(userAgent ?? '');
}
