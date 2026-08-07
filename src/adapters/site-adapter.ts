import type { SwitchResult, SwitchSnapshot, SwitchTarget } from '../domain/switching';

export type AdapterErrorCode =
  | 'unsupported-site'
  | 'target-unavailable'
  | 'control-not-found'
  | 'menu-not-found'
  | 'list-empty'
  | 'selection-failed';

export class AdapterError extends Error {
  constructor(
    message: string,
    readonly code: AdapterErrorCode,
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

export interface SiteAdapter {
  readonly id: string;
  readonly name: string;
  matches(url: URL): boolean;
  readCurrent(target: SwitchTarget): Promise<string>;
  observe(target: SwitchTarget): Promise<SwitchSnapshot>;
  cycle(target: SwitchTarget): Promise<SwitchResult>;
  select(target: SwitchTarget, optionId: string): Promise<SwitchResult>;
}
