import { browser } from 'wxt/browser';
import {
  type BackgroundRequest,
  type ContentRequest,
  type ContentResponse,
  EXTENSION_COMMANDS,
} from '../src/domain/messages';
import type { SwitchTarget } from '../src/domain/switching';

export default defineBackground(() => {
  browser.commands.onCommand.addListener((command) => {
    const target = commandTarget(command);
    if (target == null) return;
    void switchActiveTab(target);
  });

  browser.runtime.onMessage.addListener((message: BackgroundRequest) => {
    if (message?.type !== 'intelliflow:open-shortcuts') return undefined;
    return browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
});

function commandTarget(command: string): SwitchTarget | undefined {
  if (command === EXTENSION_COMMANDS.cycleModel) return 'model';
  if (command === EXTENSION_COMMANDS.cycleReasoning) return 'reasoning';
  return undefined;
}

async function switchActiveTab(target: SwitchTarget): Promise<void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) return;

  try {
    const request: ContentRequest = { type: 'intelliflow:switch', target };
    const response = (await browser.tabs.sendMessage(tab.id, request)) as ContentResponse;
    if (!response.ok && response.code !== 'cancelled' && response.code !== 'target-unavailable') {
      await showTemporaryBadge('!');
    }
  } catch {
    await showTemporaryBadge('!');
  }
}

async function showTemporaryBadge(text: string): Promise<void> {
  await browser.action.setBadgeBackgroundColor({ color: '#ee0000' });
  await browser.action.setBadgeText({ text });
  setTimeout(() => void browser.action.setBadgeText({ text: '' }), 1_800);
}
