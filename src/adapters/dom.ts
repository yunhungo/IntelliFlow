export interface DomTiming {
  waitFor<T>(lookup: () => T | undefined, timeoutMs?: number): Promise<T>;
  pause(durationMs: number): Promise<void>;
}

export function isElementVisible(element: Element): boolean {
  if (!element.isConnected || (element as HTMLElement).hidden) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;

  const view = element.ownerDocument.defaultView;
  const style = view?.getComputedStyle(element);
  return style?.display !== 'none' && style?.visibility !== 'hidden';
}

export const defaultDomTiming: DomTiming = {
  async waitFor<T>(lookup: () => T | undefined, timeoutMs = 1_500): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    let value = lookup();

    while (value == null && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 24));
      value = lookup();
    }

    if (value == null) throw new Error(`Timed out after ${timeoutMs}ms`);
    return value;
  },
  pause(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  },
};

export function normalizedText(element: Element | null | undefined): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function optionId(target: string, index: number, label: string): string {
  return `${target}:${index}:${label.toLocaleLowerCase()}`;
}
