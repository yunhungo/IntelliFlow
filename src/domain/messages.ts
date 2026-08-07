import type { SiteState, SwitchResult, SwitchTarget } from './switching';

export const EXTENSION_COMMANDS = {
  cycleModel: 'cycle-model',
  cycleReasoning: 'cycle-reasoning',
} as const;

export type ExtensionCommand = (typeof EXTENSION_COMMANDS)[keyof typeof EXTENSION_COMMANDS];

export type ContentRequest =
  | { type: 'intelliflow:switch'; target: SwitchTarget }
  | { type: 'intelliflow:select'; target: SwitchTarget; optionId: string }
  | { type: 'intelliflow:read-state' };

export type ContentResponse =
  | { ok: true; result: SwitchResult }
  | { ok: true; state: SiteState }
  | { ok: false; error: string; code?: string };

export type BackgroundRequest = { type: 'intelliflow:open-shortcuts' };

export function isContentRequest(value: unknown): value is ContentRequest {
  if (typeof value !== 'object' || value == null || !('type' in value)) return false;
  return (
    value.type === 'intelliflow:switch' ||
    value.type === 'intelliflow:select' ||
    value.type === 'intelliflow:read-state'
  );
}
