import { describe, expect, it } from 'vitest';
import {
  reasoningParticleCount,
  reasoningVisualState,
  resolveReasoningPresentation,
} from './site-presentations';

describe('reasoning site presentations', () => {
  it('uses label semantics when ChatGPT exposes only one option', () => {
    const presentation = resolveReasoningPresentation('chatgpt');
    const high = reasoningVisualState(presentation, '极高', 0, 1);
    const instant = reasoningVisualState(presentation, '极速', 0, 1);

    expect(high.scale).toBeGreaterThan(instant.scale);
    expect(high.purpleOpacity).toBeGreaterThan(0);
    expect(instant.purpleOpacity).toBe(0);
    expect(reasoningParticleCount(presentation, high.intensity)).toBeGreaterThan(
      reasoningParticleCount(presentation, instant.intensity),
    );
    expect(instant.scale).toBeGreaterThan(0.23);
    expect(instant.scale).toBeLessThan(0.27);
    expect(instant.particleScale).toBeLessThan(high.particleScale);
    expect(high.scale).toBeGreaterThan(0.9);
  });

  it('falls back to list position for an unknown website', () => {
    const presentation = resolveReasoningPresentation('future-site');
    const first = reasoningVisualState(presentation, 'A', 0, 3);
    const last = reasoningVisualState(presentation, 'C', 2, 3);

    expect(last.scale).toBeGreaterThan(first.scale);
    expect(last.purpleOpacity).toBe(1);
  });
});
