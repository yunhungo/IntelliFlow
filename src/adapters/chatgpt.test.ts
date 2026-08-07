import { beforeEach, describe, expect, it } from 'vitest';
import { ChatGptAdapter } from './chatgpt';
import type { DomTiming } from './dom';

const immediateTiming: DomTiming = {
  async waitFor(lookup) {
    const value = lookup();
    if (value == null) throw new Error('Fixture did not synchronously expose the element.');
    return value;
  },
  async pause() {},
};

describe('ChatGptAdapter', () => {
  beforeEach(() => installChatGptFixture(document));

  it('reads the current model and complete live option list', async () => {
    const adapter = new ChatGptAdapter(document, immediateTiming);
    const state = await adapter.observe('model');

    expect(state.current).toBe('GPT-5.6 Sol');
    expect(state.options.map((option) => option.label)).toEqual(['GPT-5.6 Sol', 'GPT-5.5', 'o3']);
    expect(state.options[0]?.selected).toBe(true);
  });

  it('reads the checked model when the root menu omits its trailing value', async () => {
    required<HTMLElement>(document, '#model-trigger [data-trailing-style]').remove();
    const adapter = new ChatGptAdapter(document, immediateTiming);

    await expect(adapter.readCurrent('model')).resolves.toBe('GPT-5.6 Sol');
  });

  it('treats a missing reasoning selector as unavailable for the current model', async () => {
    required<HTMLElement>(document, '#reasoning-trigger').remove();
    const adapter = new ChatGptAdapter(document, immediateTiming);

    await expect(adapter.observe('reasoning')).rejects.toMatchObject({
      code: 'target-unavailable',
    });
  });

  it('cycles to the next model and verifies the new current value', async () => {
    const adapter = new ChatGptAdapter(document, immediateTiming);
    const result = await adapter.cycle('model');

    expect(result.previous).toBe('GPT-5.6 Sol');
    expect(result.current).toBe('GPT-5.5');
    expect(result.changed).toBe(true);
    expect(result.options.find((option) => option.selected)?.label).toBe('GPT-5.5');
  });

  it('reads and directly selects a reasoning level', async () => {
    const adapter = new ChatGptAdapter(document, immediateTiming);
    const initial = await adapter.observe('reasoning');
    const target = initial.options.find((option) => option.label === '极高');

    expect(initial.current).toBe('Pro');
    expect(target).toBeDefined();

    const result = await adapter.select('reasoning', target?.id ?? 'missing');
    expect(result.current).toBe('极高');
  });

  it('waits for ChatGPT to confirm a delayed model change', async () => {
    const target = required<HTMLElement>(document, '#model-menu [role="menuitemradio"]:last-child');
    const modelMenu = required<HTMLElement>(document, '#model-menu');
    const modelTrigger = required<HTMLElement>(document, '#model-trigger');
    let pauses = 0;

    target.addEventListener('click', (event) => event.stopImmediatePropagation(), {
      capture: true,
    });

    const delayedTiming: DomTiming = {
      async waitFor(lookup) {
        const value = lookup();
        if (value == null) throw new Error('Fixture did not synchronously expose the element.');
        return value;
      },
      async pause() {
        pauses += 1;
        if (pauses !== 2) return;

        for (const option of modelMenu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')) {
          option.setAttribute('aria-checked', String(option === target));
        }
        const trailing = modelTrigger.querySelector('[data-trailing-style] span');
        if (trailing != null) trailing.textContent = 'o3';
      },
    };
    const adapter = new ChatGptAdapter(document, delayedTiming);
    const initial = await adapter.observe('model');
    const o3 = initial.options.find((option) => option.label === 'o3');

    const result = await adapter.select('model', o3?.id ?? 'missing');

    expect(result.current).toBe('o3');
    expect(result.changed).toBe(true);
    expect(pauses).toBeGreaterThanOrEqual(3);
  });
});

function installChatGptFixture(doc: Document): void {
  doc.body.innerHTML = `
    <main>
      <button id="state" class="__composer-pill" aria-haspopup="menu" aria-expanded="false">Pro</button>
    </main>
    <div id="root-menu" role="menu" hidden>
      <div role="menuitem" aria-label="能力"><span data-model-reasoning-effort-slider></span></div>
      <div id="advanced" role="menuitem" aria-label="显示高级选项" aria-expanded="false" class="ViewToggle">高级</div>
      <div id="model-trigger" role="menuitem" data-has-submenu aria-expanded="false">
        <div class="truncate">模型</div><div data-trailing-style><span>GPT-5.6 Sol</span></div>
      </div>
      <div id="reasoning-trigger" role="menuitem" data-has-submenu aria-expanded="false">
        <div class="truncate">思考强度</div><div data-trailing-style><span>Pro</span></div>
      </div>
    </div>
    <div id="model-menu" role="menu" hidden>
      <div role="menuitemradio" aria-checked="true">GPT-5.6 Sol</div>
      <div role="menuitemradio" aria-checked="false">GPT-5.5</div>
      <div role="menuitemradio" aria-checked="false">o3</div>
    </div>
    <div id="reasoning-menu" role="menu" hidden>
      <div role="menuitemradio" aria-checked="false">极速</div>
      <div role="menuitemradio" aria-checked="false">中</div>
      <div role="menuitemradio" aria-checked="false">高</div>
      <div role="menuitemradio" aria-checked="false">极高</div>
      <div role="menuitemradio" aria-checked="true">Pro</div>
    </div>
  `;

  const stateButton = required<HTMLButtonElement>(doc, '#state');
  const rootMenu = required<HTMLElement>(doc, '#root-menu');
  const advanced = required<HTMLElement>(doc, '#advanced');
  const modelTrigger = required<HTMLElement>(doc, '#model-trigger');
  const reasoningTrigger = required<HTMLElement>(doc, '#reasoning-trigger');
  const modelMenu = required<HTMLElement>(doc, '#model-menu');
  const reasoningMenu = required<HTMLElement>(doc, '#reasoning-menu');

  stateButton.addEventListener('pointerdown', () => {
    const open = stateButton.getAttribute('aria-expanded') !== 'true';
    stateButton.setAttribute('aria-expanded', String(open));
    rootMenu.hidden = !open;
    if (!open) {
      modelMenu.hidden = true;
      reasoningMenu.hidden = true;
    }
  });

  advanced.addEventListener('click', () => advanced.setAttribute('aria-expanded', 'true'));
  modelTrigger.addEventListener('pointerdown', () => {
    modelMenu.hidden = false;
    reasoningMenu.hidden = true;
    modelTrigger.setAttribute('aria-expanded', 'true');
  });
  reasoningTrigger.addEventListener('pointerdown', () => {
    reasoningMenu.hidden = false;
    modelMenu.hidden = true;
    reasoningTrigger.setAttribute('aria-expanded', 'true');
  });

  wireOptions(doc, modelMenu, modelTrigger, stateButton, rootMenu);
  wireOptions(doc, reasoningMenu, reasoningTrigger, stateButton, rootMenu);
}

function wireOptions(
  doc: Document,
  menu: HTMLElement,
  trigger: HTMLElement,
  stateButton: HTMLButtonElement,
  rootMenu: HTMLElement,
): void {
  for (const option of menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]')) {
    option.addEventListener('click', () => {
      for (const sibling of menu.querySelectorAll('[role="menuitemradio"]')) {
        sibling.setAttribute('aria-checked', String(sibling === option));
      }
      const trailing = trigger.querySelector('[data-trailing-style] span');
      if (trailing != null) trailing.textContent = option.textContent;
      stateButton.setAttribute('aria-expanded', 'false');
      rootMenu.hidden = true;
      menu.hidden = true;
      for (const openMenu of doc.querySelectorAll<HTMLElement>('[role="menu"]')) {
        if (openMenu !== rootMenu) openMenu.hidden = true;
      }
    });
  }
}

function required<T extends Element>(doc: Document, selector: string): T {
  const element = doc.querySelector<T>(selector);
  if (element == null) throw new Error(`Missing fixture element: ${selector}`);
  return element;
}
