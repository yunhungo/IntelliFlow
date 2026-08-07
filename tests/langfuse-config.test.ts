import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('project-scoped Langfuse configuration', () => {
  it('enables Codex plugin hooks and the tracing plugin', () => {
    const config = readFileSync('.codex/config.toml', 'utf8');
    expect(config).toContain('plugin_hooks = true');
    expect(config).toContain('[plugins."tracing@codex-observability-plugin"]');
    expect(config).toContain('enabled = true');
  });

  it('versions a safe example with stable dimensions', () => {
    const config = JSON.parse(readFileSync('.codex/langfuse.example.json', 'utf8'));
    expect(config.enabled).toBe(false);
    expect(config.tags).toEqual(['codex', 'intelliflow']);
    expect(config.metadata.application).toBe('intelliflow');
    expect(config.max_chars).toBe(12_000);
    expect(config).not.toHaveProperty('public_key');
    expect(config).not.toHaveProperty('secret_key');
  });

  it('keeps local credentials out of Git', () => {
    const ignore = readFileSync('.gitignore', 'utf8');
    expect(ignore).toContain('/.codex/langfuse.json');
    expect(ignore).toContain('!/.codex/langfuse.example.json');
  });
});
