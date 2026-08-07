import {
  nextEnabledOption,
  type SwitchOption,
  type SwitchResult,
  type SwitchSnapshot,
  type SwitchTarget,
  withSelectedOption,
} from '../domain/switching';
import {
  type DomTiming,
  defaultDomTiming,
  isElementVisible,
  normalizedText,
  optionId,
} from './dom';
import { AdapterError, type SiteAdapter } from './site-adapter';

interface NativeChoice {
  element: HTMLElement;
  option: SwitchOption;
}

interface NativeMenuState {
  stateButton: HTMLButtonElement;
  rootMenu: HTMLElement;
  trigger: HTMLElement;
  current: string;
  choices: NativeChoice[];
}

const ADVANCED_TOGGLE_NAMES = [
  'show advanced options',
  '显示高级选项',
  '顯示進階選項',
  '詳細オプションを表示',
];

export class ChatGptAdapter implements SiteAdapter {
  readonly id = 'chatgpt';
  readonly name = 'ChatGPT';

  constructor(
    private readonly document: Document,
    private readonly timing: DomTiming = defaultDomTiming,
  ) {}

  matches(url: URL): boolean {
    return url.hostname === 'chatgpt.com' || url.hostname.endsWith('.chatgpt.com');
  }

  async observe(target: SwitchTarget): Promise<SwitchSnapshot> {
    const nativeState = await this.openChoiceMenu(target);
    this.closeMenus(nativeState.stateButton);
    return this.toSnapshot(target, nativeState.current, nativeState.choices);
  }

  async cycle(target: SwitchTarget): Promise<SwitchResult> {
    return this.choose(target, (choices) => {
      const next = nextEnabledOption(choices.map(({ option }) => option));
      return choices.find(({ option }) => option.id === next?.id);
    });
  }

  async select(target: SwitchTarget, selectedId: string): Promise<SwitchResult> {
    return this.choose(target, (choices) =>
      choices.find(({ option }) => option.id === selectedId && !option.disabled),
    );
  }

  private async choose(
    target: SwitchTarget,
    chooseOption: (choices: NativeChoice[]) => NativeChoice | undefined,
  ): Promise<SwitchResult> {
    const nativeState = await this.openChoiceMenu(target);
    const previous = nativeState.current;
    const choice = chooseOption(nativeState.choices);

    if (choice == null) {
      this.closeMenus(nativeState.stateButton);
      throw new AdapterError('The requested option is not available.', 'selection-failed');
    }

    const previousSelectionId = nativeState.choices.find(({ option }) => option.selected)?.option
      .id;
    activateElement(choice.element);
    const verifiedCurrent = await this.waitForCurrent(target, choice.option.label);
    if (target === 'model') await this.timing.pause(120);
    const selectedOptions = withSelectedOption(
      nativeState.choices.map(({ option }) => option),
      choice.option.id,
    );

    return {
      ...this.toSnapshot(target, verifiedCurrent, selectedOptions),
      previous,
      changed: previousSelectionId !== choice.option.id,
    };
  }

  private async waitForCurrent(target: SwitchTarget, expected: string): Promise<string> {
    let lastObserved = '';

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await this.timing.pause(attempt === 0 ? 180 : 120);
      const current = await this.readCurrent(target).catch(() => '');
      if (!current) continue;

      lastObserved = current;
      if (sameOptionLabel(current, expected)) return current;
    }

    const detail = lastObserved ? ` The menu still reports “${lastObserved}”.` : '';
    throw new AdapterError(
      `ChatGPT did not confirm the requested ${target} selection.${detail}`,
      'selection-failed',
    );
  }

  async readCurrent(target: SwitchTarget): Promise<string> {
    const nativeState = await this.openChoiceMenu(target);
    this.closeMenus(nativeState.stateButton);
    return nativeState.current;
  }

  private async openChoiceMenu(target: SwitchTarget): Promise<NativeMenuState> {
    const stateButton = await this.openStateButton();

    try {
      const rootMenu = await this.openRootMenu(stateButton);
      await this.ensureAdvancedView(rootMenu);
      const trigger = this.targetTrigger(rootMenu, target);
      const current = this.readTrailingValue(trigger);

      activateElement(trigger);
      const submenu = await this.waitForSubmenu(rootMenu);
      const choices = this.readChoices(submenu, target);

      if (choices.length === 0) {
        throw new AdapterError('ChatGPT returned an empty option list.', 'list-empty');
      }

      const selected = choices.find(({ option }) => option.selected)?.option.label;
      return {
        stateButton,
        rootMenu,
        trigger,
        current: selected ?? current ?? choices[0]?.option.label ?? '',
        choices,
      };
    } catch (error) {
      this.closeMenus(stateButton);
      if (error instanceof AdapterError) throw error;
      const detail = error instanceof Error ? ` ${error.message}` : '';
      throw new AdapterError(`Unable to read the current ChatGPT menu.${detail}`, 'menu-not-found');
    }
  }

  private async openStateButton(): Promise<HTMLButtonElement> {
    try {
      return await this.timing.waitFor(() => {
        const candidates = Array.from(
          this.document.querySelectorAll<HTMLButtonElement>('main button[aria-haspopup="menu"]'),
        ).filter(isElementVisible);

        return (
          candidates.find((button) => button.className.includes('__composer-pill')) ??
          candidates.find((button) => !button.getAttribute('aria-label'))
        );
      });
    } catch {
      throw new AdapterError(
        'Open a ChatGPT conversation or new-chat composer, then try again.',
        'control-not-found',
      );
    }
  }

  private async openRootMenu(stateButton: HTMLButtonElement): Promise<HTMLElement> {
    if (stateButton.getAttribute('aria-expanded') !== 'true') activateElement(stateButton);

    try {
      return await this.timing.waitFor(() =>
        this.visibleMenus().find(
          (menu) =>
            menu.querySelector('[data-model-reasoning-effort-slider]') != null ||
            menu.querySelector('[role="menuitem"][data-has-submenu]') != null,
        ),
      );
    } catch {
      throw new AdapterError('The ChatGPT state menu did not open.', 'menu-not-found');
    }
  }

  private async ensureAdvancedView(rootMenu: HTMLElement): Promise<void> {
    const toggle = Array.from(rootMenu.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
      (item) => {
        const label = (item.getAttribute('aria-label') ?? '').toLocaleLowerCase();
        return (
          item.getAttribute('aria-expanded') === 'false' &&
          (item.className.includes('ViewToggle') || ADVANCED_TOGGLE_NAMES.includes(label))
        );
      },
    );

    if (toggle == null) return;
    activateElement(toggle);

    try {
      await this.timing.waitFor(() =>
        toggle.getAttribute('aria-expanded') === 'true' ? toggle : undefined,
      );
    } catch {
      throw new AdapterError('ChatGPT advanced options did not open.', 'menu-not-found');
    }
  }

  private targetTrigger(rootMenu: HTMLElement, target: SwitchTarget): HTMLElement {
    const triggers = Array.from(
      rootMenu.querySelectorAll<HTMLElement>('[role="menuitem"][data-has-submenu]'),
    ).filter(isElementVisible);
    const trigger = triggers[target === 'model' ? 0 : 1];

    if (trigger == null) {
      if (target === 'reasoning') {
        throw new AdapterError(
          'The current ChatGPT model does not offer adjustable reasoning effort.',
          'target-unavailable',
        );
      }
      throw new AdapterError(`ChatGPT does not expose a ${target} selector.`, 'menu-not-found');
    }
    return trigger;
  }

  private async waitForSubmenu(rootMenu: HTMLElement): Promise<HTMLElement> {
    try {
      return await this.timing.waitFor(() =>
        this.visibleMenus().find(
          (menu) => menu !== rootMenu && menu.querySelector('[role="menuitemradio"]') != null,
        ),
      );
    } catch {
      throw new AdapterError('The ChatGPT option list did not open.', 'menu-not-found');
    }
  }

  private visibleMenus(): HTMLElement[] {
    return Array.from(this.document.querySelectorAll<HTMLElement>('[role="menu"]')).filter(
      isElementVisible,
    );
  }

  private readChoices(menu: HTMLElement, target: SwitchTarget): NativeChoice[] {
    return Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
      .filter(isElementVisible)
      .map((element, index) => {
        const label = normalizedText(element);
        const selected =
          element.getAttribute('aria-checked') === 'true' ||
          element.getAttribute('data-state') === 'checked';
        return {
          element,
          option: {
            id: optionId(target, index, label),
            label,
            selected,
            disabled: element.getAttribute('aria-disabled') === 'true',
          },
        };
      })
      .filter(({ option }) => option.label.length > 0);
  }

  private readTrailingValue(trigger: HTMLElement): string {
    const trailing = trigger.querySelector('[data-trailing-style]');
    if (trailing != null) return normalizedText(trailing);

    const text = normalizedText(trigger);
    const firstLabel = normalizedText(trigger.querySelector('.truncate'));
    return firstLabel && text.startsWith(firstLabel) ? text.slice(firstLabel.length).trim() : text;
  }

  private closeMenus(stateButton: HTMLButtonElement): void {
    if (stateButton.getAttribute('aria-expanded') === 'true') activateElement(stateButton);
  }

  private toSnapshot(
    target: SwitchTarget,
    current: string,
    choices: NativeChoice[] | SwitchOption[],
  ): SwitchSnapshot {
    const options = choices.map((choice) => ('option' in choice ? choice.option : choice));
    return {
      siteId: this.id,
      siteName: this.name,
      target,
      current,
      options,
      observedAt: Date.now(),
    };
  }
}

function activateElement(element: HTMLElement): void {
  const view = element.ownerDocument.defaultView;
  if (view == null) {
    element.click();
    return;
  }

  element.focus({ preventScroll: true });

  const mouseDown: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    buttons: 1,
    detail: 1,
  };
  const mouseUp: MouseEventInit = { ...mouseDown, buttons: 0 };

  if (typeof view.PointerEvent === 'function') {
    const pointerDown: PointerEventInit = {
      ...mouseDown,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
    };
    element.dispatchEvent(new view.PointerEvent('pointerdown', pointerDown));
    element.dispatchEvent(new view.MouseEvent('mousedown', mouseDown));
    element.dispatchEvent(new view.PointerEvent('pointerup', { ...pointerDown, buttons: 0 }));
  } else {
    element.dispatchEvent(new view.MouseEvent('mousedown', mouseDown));
  }

  element.dispatchEvent(new view.MouseEvent('mouseup', mouseUp));
  element.dispatchEvent(new view.MouseEvent('click', mouseUp));
}

function sameOptionLabel(left: string, right: string): boolean {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  return normalize(left) === normalize(right);
}
