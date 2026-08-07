import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('wxt/browser', () => ({
  browser: {
    commands: { getAll: vi.fn().mockResolvedValue([]) },
    runtime: { sendMessage: vi.fn() },
  },
}));

describe('options menu', () => {
  it('keeps only actionable shortcut and site information', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: '快捷键' })).toBeInTheDocument();
    expect(screen.getByText('切换模型')).toBeInTheDocument();
    expect(screen.getByText('切换思考强度')).toBeInTheDocument();
    expect(screen.queryByText('修改')).not.toBeInTheDocument();
    expect(screen.getByText('ChatGPT')).toBeInTheDocument();
    expect(screen.queryByText('IntelliFlow')).not.toBeInTheDocument();
    expect(screen.queryByText(/后续版本|第一版聚焦|macOS 支持|Settings/i)).not.toBeInTheDocument();
  });
});
