import { createRoot } from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { createDefaultAdapterRegistry } from '../../src/adapters/registry';
import { isMacUserAgent, matchNativeMacShortcut } from '../../src/application/native-shortcuts';
import { ShortcutSessionCoordinator } from '../../src/application/shortcut-session';
import { SwitchStateCache } from '../../src/application/state-cache';
import { SwitchCoordinator } from '../../src/application/switch-coordinator';
import { registerWindowBlurCancellation } from '../../src/application/window-cancellation';
import { isContentRequest } from '../../src/domain/messages';
import { OverlayController } from '../../src/ui/overlay/overlay-controller';
import { SwitchOverlay } from '../../src/ui/overlay/SwitchOverlay';
import './style.css';

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',

  async main(ctx) {
    const overlay = new OverlayController();
    const adapter = createDefaultAdapterRegistry(document).resolve(new URL(window.location.href));
    const stateCache = new SwitchStateCache();
    const coordinator = new SwitchCoordinator(adapter, overlay, stateCache);
    const shortcutSession = new ShortcutSessionCoordinator(adapter, overlay, stateCache);
    const cancelInteraction = () => {
      shortcutSession.cancel();
      coordinator.cancelPending();
    };

    const ui = await createShadowRootUi(ctx, {
      name: 'intelliflow-overlay',
      position: 'overlay',
      anchor: 'body',
      isolateEvents: true,
      onMount(container) {
        const app = document.createElement('div');
        app.dataset.intelliflowBuild = '0.1.0-20260809.1';
        container.append(app);
        const root = createRoot(app);
        root.render(
          <SwitchOverlay
            controller={overlay}
            onDismiss={cancelInteraction}
            onSelect={(target, optionId) => {
              if (shortcutSession.select(target, optionId)) return;
              void coordinator.handle({ type: 'intelliflow:select', target, optionId });
            }}
          />,
        );
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();

    browser.runtime.onMessage.addListener((message: unknown) => {
      if (!isContentRequest(message)) return undefined;
      return coordinator.handle(message);
    });

    const useNativeMacShortcuts = isMacUserAgent(globalThis.navigator?.userAgent);
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          cancelInteraction();
          return;
        }

        if (!useNativeMacShortcuts) return;
        const target = matchNativeMacShortcut(event);
        if (target == null) return;

        event.preventDefault();
        event.stopPropagation();
        shortcutSession.advance(target);
      },
      true,
    );

    document.addEventListener(
      'keyup',
      (event) => {
        if (!useNativeMacShortcuts || (event.key !== 'Control' && event.key !== 'Alt')) return;
        shortcutSession.release();
      },
      true,
    );

    // Do not capture this event: a captured `blur` also fires when ChatGPT moves
    // focus from the composer into its menu, which would cancel the session before
    // React can paint the overlay. A bubbling-phase listener on Window only sees
    // the actual browser-window blur that we want to handle.
    registerWindowBlurCancellation(window, cancelInteraction);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') cancelInteraction();
    });
  },
});
