export type SwitchTarget = 'model' | 'reasoning';

export interface SwitchOption {
  id: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
}

export interface SwitchSnapshot {
  siteId: string;
  siteName: string;
  target: SwitchTarget;
  current: string;
  options: SwitchOption[];
  observedAt: number;
}

export interface SwitchResult extends SwitchSnapshot {
  previous: string;
  changed: boolean;
}

export interface SiteState {
  siteId: string;
  siteName: string;
  model: SwitchSnapshot;
  reasoning?: SwitchSnapshot;
}

export function nextEnabledOption(
  options: SwitchOption[],
  currentId?: string,
): SwitchOption | undefined {
  const enabled = options.filter((option) => !option.disabled);
  if (enabled.length === 0) return undefined;

  const selectedIndex = enabled.findIndex(
    (option) => option.id === currentId || (currentId == null && option.selected),
  );
  return enabled[(selectedIndex + 1 + enabled.length) % enabled.length];
}

export function withSelectedOption(options: SwitchOption[], selectedId: string): SwitchOption[] {
  return options.map((option) => ({ ...option, selected: option.id === selectedId }));
}
