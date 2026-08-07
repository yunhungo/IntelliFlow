import { Check, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { ShortcutKeys } from '../../src/ui/components';

interface ShortcutRow {
  description?: string;
  name?: string;
  shortcut?: string;
}

export function App() {
  const [commands, setCommands] = useState<ShortcutRow[]>([]);

  useEffect(() => {
    void browser.commands.getAll().then(setCommands);
  }, []);

  const model = commands.find((command) => command.name === 'cycle-model');
  const reasoning = commands.find((command) => command.name === 'cycle-reasoning');
  const openShortcuts = () =>
    void browser.runtime.sendMessage({ type: 'intelliflow:open-shortcuts' });

  return (
    <main className="options-shell">
      <section className="options-group" aria-labelledby="shortcuts-title">
        <header className="options-group-header">
          <h1 id="shortcuts-title">快捷键</h1>
        </header>
        <div className="options-list">
          <CommandRow label="切换模型" onClick={openShortcuts} shortcut={model?.shortcut} />
          <CommandRow label="切换思考强度" onClick={openShortcuts} shortcut={reasoning?.shortcut} />
        </div>
      </section>

      <section className="options-group" aria-labelledby="sites-title">
        <header className="options-group-header">
          <h2 id="sites-title">网站</h2>
        </header>
        <div className="options-list">
          <div className="adapter-row">
            <span>ChatGPT</span>
            <span className="adapter-status">
              <Check size={13} strokeWidth={2.2} /> 已启用
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function CommandRow({
  label,
  onClick,
  shortcut,
}: {
  label: string;
  onClick(): void;
  shortcut?: string;
}) {
  return (
    <button
      aria-label={`修改${label}快捷键`}
      className="command-row"
      onClick={onClick}
      type="button"
    >
      <span className="command-name">{label}</span>
      <span className="command-trailing">
        <ShortcutKeys shortcut={shortcut} />
        <ChevronRight aria-hidden="true" size={14} strokeWidth={1.8} />
      </span>
    </button>
  );
}
