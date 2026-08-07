import { type CSSProperties, useMemo } from 'react';
import type { SwitchResult } from '../../domain/switching';
import {
  reasoningParticleCount,
  reasoningVisualState,
  resolveReasoningPresentation,
} from './site-presentations';

interface ReasoningSelectorProps {
  result: SwitchResult;
  onSelect(optionId: string): void;
}

export function ReasoningSelector({ result, onSelect }: ReasoningSelectorProps) {
  const selectedIndex = Math.max(
    0,
    result.options.findIndex((option) => option.selected),
  );
  const selected = result.options[selectedIndex];
  const presentation = resolveReasoningPresentation(result.siteId);
  const visual = reasoningVisualState(
    presentation,
    selected?.label ?? result.current,
    selectedIndex,
    result.options.length,
  );
  const palette = presentation.palette;
  const particleCount = reasoningParticleCount(presentation, visual.intensity);
  const particles = useMemo(
    () => createParticles(result.siteId, presentation.particles.maxCount, presentation.particles),
    [presentation.particles, result.siteId],
  );
  const selectorStyle = {
    '--if-reasoning-scale': visual.scale,
    '--if-reasoning-blue-opacity': visual.blueOpacity,
    '--if-reasoning-purple-opacity': visual.purpleOpacity,
    '--if-reasoning-neutral-light': palette.neutralLight,
    '--if-reasoning-neutral-dark': palette.neutralDark,
    '--if-reasoning-blue-light': palette.blueLight,
    '--if-reasoning-blue-dark': palette.blueDark,
    '--if-reasoning-purple-light': palette.purpleLight,
    '--if-reasoning-purple-dark': palette.purpleDark,
    '--if-reasoning-particle-light': palette.particleLight,
    '--if-reasoning-particle-accent': palette.particleAccent,
    '--if-reasoning-motion-duration': `${presentation.transitionMs}ms`,
    '--if-reasoning-motion-easing': presentation.transitionEasing,
  } as CSSProperties;

  return (
    <div className="if-reasoning-selector" style={selectorStyle}>
      <div className="if-reasoning-orb-frame" aria-hidden="true">
        <div className="if-reasoning-orb">
          <span className="if-reasoning-orb-texture" />
          <span className="if-reasoning-particles">
            {particles.map((particle, index) => (
              <span
                className={`if-reasoning-particle ${index < particleCount ? 'if-reasoning-particle--active' : ''}`}
                key={particle.id}
                style={
                  {
                    ...particle.style,
                    '--if-particle-size': `${particle.size * visual.particleScale}px`,
                    '--if-particle-dx': `${particle.dx * visual.particleScale}px`,
                    '--if-particle-dy': `${particle.dy * visual.particleScale}px`,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        </div>
      </div>

      <fieldset className="if-reasoning-label-track" aria-label="思考强度选项">
        {result.options.map((option, index) => {
          const offset = circularOffset(index, selectedIndex, result.options.length);
          const distance = Math.abs(offset);
          const optionStyle = {
            opacity: distance > 1 ? 0 : 1 - distance * 0.48,
            pointerEvents: distance > 1 ? 'none' : 'auto',
            transform: `translateX(calc(-50% + ${offset * presentation.optionSpacing}px)) scale(${option.selected ? 1 : 0.9})`,
          } as CSSProperties;

          return (
            <button
              aria-pressed={option.selected}
              className={`if-reasoning-label ${option.selected ? 'if-reasoning-label--selected' : ''}`}
              disabled={option.disabled}
              key={option.id}
              onClick={() => onSelect(option.id)}
              style={optionStyle}
              tabIndex={distance > 1 ? -1 : 0}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}

interface ParticleDefinition {
  id: number;
  size: number;
  dx: number;
  dy: number;
  style: CSSProperties;
}

function createParticles(
  seedText: string,
  count: number,
  config: ReturnType<typeof resolveReasoningPresentation>['particles'],
): ParticleDefinition[] {
  const random = seededRandom(hashString(seedText));
  return Array.from({ length: count }, (_, id) => {
    const size = mix(config.minSize, config.maxSize, random());
    const travel = mix(config.minTravel, config.maxTravel, random());
    const angle = random() * Math.PI * 2;
    const dx = Math.cos(angle) * travel;
    const dy = Math.sin(angle) * travel;
    const duration = mix(config.minDurationMs, config.maxDurationMs, random());
    const style = {
      '--if-particle-x': `${14 + random() * 72}%`,
      '--if-particle-y': `${14 + random() * 72}%`,
      '--if-particle-opacity': mix(config.minOpacity, config.maxOpacity, random()),
      '--if-particle-duration': `${duration}ms`,
      '--if-particle-delay': `${-random() * duration}ms`,
      '--if-particle-color': id % 3 === 0 ? 'var(--if-reasoning-particle-accent)' : undefined,
    } as CSSProperties;
    return { id, size, dx, dy, style };
  });
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(initialSeed: number): () => number {
  let seed = initialSeed || 1;
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), seed | 1);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), seed | 61);
    return ((seed ^ (seed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function mix(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function circularOffset(index: number, selectedIndex: number, count: number): number {
  if (count <= 1) return 0;
  let offset = index - selectedIndex;
  const half = count / 2;
  if (offset > half) offset -= count;
  if (offset < -half) offset += count;
  return offset;
}
