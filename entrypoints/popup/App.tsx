import { RefreshCw, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import type { ContentRequest, ContentResponse } from '../../src/domain/messages';
import type { SiteState } from '../../src/domain/switching';
import { BrandMark, ShortcutKeys } from '../../src/ui/components';

interface ShortcutMap {
  model?: string;
  reasoning?: string;
}

export function App() {
  const [state, setState] = useState<SiteState>();
  const [shortcuts, setShortcuts] = useState<ShortcutMap>({});
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const [commands, tabs] = await Promise.all([
        browser.commands.getAll(),
        browser.tabs.query({ active: true, currentWindow: true }),
      ]);
      setShortcuts({
        model: commands.find((command) => command.name === 'cycle-model')?.shortcut,
        reasoning: commands.find((command) => command.name === 'cycle-reasoning')?.shortcut,
      });

      const tab = tabs[0];
      if (tab?.id == null || !tab.url?.startsWith('https://chatgpt.com/')) {
        throw new Error('请在 ChatGPT 页面打开 IntelliFlow。');
      }

      const request: ContentRequest = { type: 'intelliflow:read-state' };
      const response = (await browser.tabs.sendMessage(tab.id, request)) as ContentResponse;
      if (!response.ok) throw new Error(response.error);
      if (!('state' in response)) throw new Error('页面没有返回状态数据。');
      setState(response.state);
    } catch (caught) {
      setState(undefined);
      setError(caught instanceof Error ? caught.message : '无法读取当前页面状态。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div className="popup-brand">
          <BrandMark />
          <h1>IntelliFlow</h1>
        </div>
        <div className="popup-actions">
          <button
            aria-label="刷新状态"
            className="icon-button"
            disabled={loading}
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={15} strokeWidth={1.8} />
          </button>
          <button
            aria-label="打开设置"
            className="icon-button"
            onClick={() => void browser.runtime.openOptionsPage()}
            type="button"
          >
            <Settings2 size={15} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {state ? (
        <section className="state-list" aria-live="polite">
          <StateRow label="模型" shortcut={shortcuts.model} value={state.model.current} />
          <StateRow
            label="思考强度"
            shortcut={shortcuts.reasoning}
            value={state.reasoning?.current ?? '不可调节'}
          />
        </section>
      ) : (
        <section className="popup-notice" aria-live="polite">
          <span>{loading ? '正在读取…' : (error ?? '暂时无法读取页面状态。')}</span>
          {!loading && (
            <button className="notice-action" onClick={() => void refresh()} type="button">
              重试
            </button>
          )}
        </section>
      )}
    </main>
  );
}

function StateRow({ label, shortcut, value }: { label: string; shortcut?: string; value: string }) {
  return (
    <article className="state-row">
      <div className="state-copy">
        <span className="state-label">{label}</span>
        <strong title={value}>{value}</strong>
      </div>
      <ShortcutKeys shortcut={shortcut} />
    </article>
  );
}
