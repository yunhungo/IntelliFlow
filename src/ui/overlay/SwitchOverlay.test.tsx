import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SwitchResult } from '../../domain/switching';
import { OverlayController } from './overlay-controller';
import { SwitchOverlay } from './SwitchOverlay';

vi.mock('liquid-glass-react', () => ({
  default: ({ children, mode }: { children: ReactNode; mode: string }) => (
    <div data-mode={mode} data-testid="liquid-glass">
      {children}
    </div>
  ),
}));

describe('SwitchOverlay', () => {
  it('uses the stable non-canvas liquid glass mode', () => {
    const controller = new OverlayController();
    controller.showPreview(result(), false);

    render(<SwitchOverlay controller={controller} onDismiss={vi.fn()} onSelect={vi.fn()} />);

    expect(screen.getByTestId('liquid-glass')).toHaveAttribute('data-mode', 'prominent');
    expect(screen.getByRole('heading', { name: '选择思考努力程度' })).toBeInTheDocument();
    expect(screen.queryByText(/Reasoning level|继续按键循环/)).not.toBeInTheDocument();
  });

  it('keeps the model selector focused on the options', () => {
    const controller = new OverlayController();
    controller.showPreview(modelResult(), false);

    render(<SwitchOverlay controller={controller} onDismiss={vi.fn()} onSelect={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '选择模型' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GPT-5.6 Sol' })).toBeInTheDocument();
    expect(screen.queryByText(/Model switch|继续按键循环|将切换到|已应用/)).not.toBeInTheDocument();
    expect(screen.queryByText('01')).not.toBeInTheDocument();
  });

  it('remounts the glass surface when loading becomes a model list', () => {
    const controller = new OverlayController();
    controller.showPending('model');
    const view = render(
      <SwitchOverlay controller={controller} onDismiss={vi.fn()} onSelect={vi.fn()} />,
    );
    const loadingSurface = view.container.querySelector('[data-testid="liquid-glass"]');
    expect(loadingSurface).not.toBeNull();

    act(() => controller.showPreview(modelResult(), false));

    expect(view.container.querySelector('[data-testid="liquid-glass"]')).not.toBe(loadingSurface);
  });

  it('presents an unavailable reasoning model as a normal compact state', () => {
    const controller = new OverlayController();
    controller.showUnavailable('o3', false);

    render(<SwitchOverlay controller={controller} onDismiss={vi.fn()} onSelect={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('o3 不支持调节');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('无法切换')).not.toBeInTheDocument();
  });
});

function result(): SwitchResult {
  return {
    siteId: 'chatgpt',
    siteName: 'ChatGPT',
    target: 'reasoning',
    current: '高',
    previous: '中',
    changed: true,
    options: [
      { id: 'medium', label: '中', selected: false },
      { id: 'high', label: '高', selected: true },
    ],
    observedAt: 1,
  };
}

function modelResult(): SwitchResult {
  return {
    siteId: 'chatgpt',
    siteName: 'ChatGPT',
    target: 'model',
    current: 'GPT-5.6 Sol',
    previous: 'GPT-5.5',
    changed: true,
    options: [
      { id: 'sol', label: 'GPT-5.6 Sol', selected: true },
      { id: 'o3', label: 'o3', selected: false },
    ],
    observedAt: 1,
  };
}
