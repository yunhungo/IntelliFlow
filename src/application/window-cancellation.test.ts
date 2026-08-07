import { describe, expect, it, vi } from 'vitest';
import { registerWindowBlurCancellation } from './window-cancellation';

describe('registerWindowBlurCancellation', () => {
  it('ignores focus changes inside the page and reacts to an actual window blur', () => {
    const cancel = vi.fn();
    const unregister = registerWindowBlurCancellation(window, cancel);
    const input = document.createElement('input');
    document.body.append(input);

    input.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
    expect(cancel).not.toHaveBeenCalled();

    window.dispatchEvent(new FocusEvent('blur'));
    expect(cancel).toHaveBeenCalledOnce();

    unregister();
  });
});
