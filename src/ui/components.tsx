import { BrainCircuit } from 'lucide-react';
import type { ReactNode } from 'react';

export function BrandMark(): ReactNode {
  return (
    <span className="if-brand-mark">
      <BrainCircuit size={20} strokeWidth={1.8} />
    </span>
  );
}

export function ShortcutKeys({ shortcut }: { shortcut?: string }): ReactNode {
  if (!shortcut) return <span className="text-xs text-[#a1a1a1]">未分配</span>;

  const normalized = shortcut
    .replaceAll('MacCtrl', 'Ctrl')
    .replaceAll('Command', '⌘')
    .replaceAll('Ctrl', '⌃')
    .replaceAll('Alt', '⌥')
    .replaceAll('Option', '⌥')
    .replaceAll('Shift', '⇧');

  return (
    <span className="flex items-center gap-1" title={shortcut}>
      <kbd className="if-kbd if-kbd--shortcut">{normalized.split('+').join(' ')}</kbd>
    </span>
  );
}
