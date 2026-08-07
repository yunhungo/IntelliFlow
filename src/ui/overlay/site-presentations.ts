export interface ReasoningPalette {
  neutralLight: string;
  neutralDark: string;
  blueLight: string;
  blueDark: string;
  purpleLight: string;
  purpleDark: string;
  particleLight: string;
  particleAccent: string;
}

export interface ReasoningParticleStyle {
  minCount: number;
  maxCount: number;
  minSize: number;
  maxSize: number;
  minOpacity: number;
  maxOpacity: number;
  minTravel: number;
  maxTravel: number;
  minDurationMs: number;
  maxDurationMs: number;
}

export interface ReasoningPresentation {
  minScale: number;
  maxScale: number;
  optionSpacing: number;
  transitionMs: number;
  transitionEasing: string;
  palette: ReasoningPalette;
  particles: ReasoningParticleStyle;
  intensity(label: string, index: number, count: number): number;
}

const defaultPresentation: ReasoningPresentation = {
  minScale: 0.68,
  maxScale: 1,
  optionSpacing: 88,
  transitionMs: 300,
  transitionEasing: 'cubic-bezier(0.22, 0.8, 0.22, 1)',
  palette: {
    neutralLight: '#d7dce3',
    neutralDark: '#606a77',
    blueLight: '#83b7ff',
    blueDark: '#255dc8',
    purpleLight: '#c7a7ff',
    purpleDark: '#7044cb',
    particleLight: 'rgb(255 255 255 / 78%)',
    particleAccent: 'rgb(205 224 255 / 64%)',
  },
  particles: {
    minCount: 5,
    maxCount: 19,
    minSize: 1.5,
    maxSize: 4.2,
    minOpacity: 0.28,
    maxOpacity: 0.78,
    minTravel: 3,
    maxTravel: 11,
    minDurationMs: 2_800,
    maxDurationMs: 6_800,
  },
  intensity: (_label, index, count) => (count <= 1 ? 0.5 : index / (count - 1)),
};

const chatGptIntensities = new Map([
  ['极速', 0.08],
  ['instant', 0.08],
  ['low', 0.2],
  ['低', 0.2],
  ['中', 0.42],
  ['medium', 0.42],
  ['高', 0.66],
  ['high', 0.66],
  ['极高', 0.84],
  ['very high', 0.84],
  ['pro', 1],
]);

const chatGptPresentation: ReasoningPresentation = {
  ...defaultPresentation,
  minScale: 0.18,
  maxScale: 1.04,
  optionSpacing: 92,
  transitionMs: 320,
  particles: {
    ...defaultPresentation.particles,
    minCount: 4,
    maxCount: 22,
    maxSize: 4.6,
    maxTravel: 12,
  },
  intensity(label, index, count) {
    return chatGptIntensities.get(normalizeLabel(label)) ?? defaultIntensity(index, count);
  },
};

const presentations: Record<string, ReasoningPresentation> = {
  chatgpt: chatGptPresentation,
};

export function resolveReasoningPresentation(siteId: string): ReasoningPresentation {
  return presentations[siteId] ?? defaultPresentation;
}

export function reasoningVisualState(
  presentation: ReasoningPresentation,
  label: string,
  index: number,
  count: number,
): {
  intensity: number;
  scale: number;
  particleScale: number;
  blueOpacity: number;
  purpleOpacity: number;
} {
  const intensity = clamp(presentation.intensity(label, index, count));
  return {
    intensity,
    scale: presentation.minScale + (presentation.maxScale - presentation.minScale) * intensity,
    particleScale: 0.46 + intensity * 0.54,
    blueOpacity: clamp(intensity * 1.7),
    purpleOpacity: clamp((intensity - 0.52) / 0.48),
  };
}

export function reasoningParticleCount(
  presentation: ReasoningPresentation,
  intensity: number,
): number {
  const { minCount, maxCount } = presentation.particles;
  return Math.round(minCount + (maxCount - minCount) * clamp(intensity));
}

function defaultIntensity(index: number, count: number): number {
  return count <= 1 ? 0.5 : index / (count - 1);
}

function normalizeLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
