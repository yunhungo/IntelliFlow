import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SwitchResult } from '../../domain/switching';
import { ReasoningSelector } from './ReasoningSelector';

describe('ReasoningSelector', () => {
  it('moves replacement labels through an invisible buffer slot', () => {
    const { rerender } = render(<ReasoningSelector result={result(0)} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: '高' })).toHaveStyle({ opacity: '0' });
    expect(screen.getByRole('button', { name: '极高' })).toHaveStyle({ opacity: '0' });

    rerender(<ReasoningSelector result={result(1)} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: '高' })).toHaveStyle({ opacity: '0.52' });
    expect(screen.getByRole('button', { name: '极高' })).toHaveStyle({ opacity: '0' });
  });
});

function result(selectedIndex: number): SwitchResult {
  const labels = ['极速', '中', '高', '极高', 'Pro'];
  const current = labels[selectedIndex] ?? '极速';
  const previous = labels[(selectedIndex + labels.length - 1) % labels.length] ?? current;
  return {
    siteId: 'chatgpt',
    siteName: 'ChatGPT',
    target: 'reasoning',
    current,
    previous,
    changed: true,
    options: labels.map((label, index) => ({
      id: label,
      label,
      selected: index === selectedIndex,
    })),
    observedAt: 1,
  };
}
