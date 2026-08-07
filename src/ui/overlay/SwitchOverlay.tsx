import LiquidGlass from 'liquid-glass-react';
import { Check, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { SwitchTarget } from '../../domain/switching';
import type { OverlayController } from './overlay-controller';
import { ReasoningSelector } from './ReasoningSelector';

interface SwitchOverlayProps {
  controller: OverlayController;
  onDismiss(): void;
  onSelect(target: SwitchTarget, optionId: string): void;
}

export function SwitchOverlay({ controller, onDismiss, onSelect }: SwitchOverlayProps) {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const selectedOptionRef = useRef<HTMLButtonElement>(null);
  const selectedOptionId =
    state.visible && (state.kind === 'preview' || state.kind === 'result')
      ? state.result.options.find((option) => option.selected)?.id
      : undefined;

  useEffect(() => {
    const selectedOption = selectedOptionRef.current;
    if (selectedOptionId != null && typeof selectedOption?.scrollIntoView === 'function') {
      selectedOption.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [selectedOptionId]);

  if (!state.visible) return null;
  const stageClassName = state.closing
    ? 'if-overlay-stage if-overlay-stage--closing'
    : 'if-overlay-stage';

  if (state.kind === 'pending') {
    return (
      <div className={stageClassName}>
        <DismissLayer onDismiss={onDismiss} />
        <GlassPanel
          key={`pending-${state.target}`}
          aria-live="polite"
          aria-busy="true"
          className="if-overlay-card if-overlay-card--message"
        >
          <div className="if-overlay-icon">
            <LoaderCircle className="if-spinner" size={20} strokeWidth={1.8} />
          </div>
          <div>
            <h2>{state.target === 'model' ? '正在读取模型' : '正在读取思考强度'}</h2>
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className={stageClassName} role="alert">
        <DismissLayer onDismiss={onDismiss} />
        <GlassPanel key="error" className="if-overlay-card if-overlay-card--message">
          <div className="if-overlay-icon">
            <TriangleAlert size={20} strokeWidth={1.8} />
          </div>
          <div>
            <h2>无法切换</h2>
            <p>{state.message}</p>
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (state.kind === 'unavailable') {
    return (
      <div className={stageClassName} role="status">
        <DismissLayer onDismiss={onDismiss} />
        <GlassPanel key="unavailable" className="if-overlay-card if-overlay-card--unavailable">
          <p>
            <strong>{state.modelName}</strong> 不支持调节
          </p>
        </GlassPanel>
      </div>
    );
  }

  const { result } = state;
  const isModel = result.target === 'model';

  return (
    <div className={stageClassName}>
      <DismissLayer onDismiss={onDismiss} />
      <GlassPanel
        key={`${result.target}-${result.options.length}`}
        aria-label={`${isModel ? '模型' : '思考强度'}切换器`}
        aria-live="polite"
        className={`if-overlay-card ${isModel ? 'if-overlay-card--model' : ''}`}
      >
        <header className="if-overlay-header if-overlay-header--minimal">
          <h2>{isModel ? '选择模型' : '选择思考努力程度'}</h2>
        </header>

        {isModel ? (
          <div className="if-option-list">
            {result.options.map((option) => (
              <button
                className={`if-option ${option.selected ? 'if-option--selected' : ''}`}
                disabled={option.disabled}
                key={option.id}
                onClick={() => onSelect(result.target, option.id)}
                ref={option.selected ? selectedOptionRef : undefined}
                aria-pressed={option.selected}
                type="button"
              >
                <span className="if-option-label">{option.label}</span>
                <span className="if-option-check" aria-hidden="true">
                  {option.selected && <Check size={16} strokeWidth={2.2} />}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <ReasoningSelector
            result={result}
            onSelect={(optionId) => onSelect(result.target, optionId)}
          />
        )}
      </GlassPanel>
    </div>
  );
}

function GlassPanel({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return (
    <div className="if-liquid-panel-motion">
      <LiquidGlass
        aberrationIntensity={1.4}
        blurAmount={0.06}
        className="if-liquid-shell"
        cornerRadius={17}
        displacementScale={54}
        elasticity={0.06}
        mode="prominent"
        padding="0"
        saturation={145}
        style={{ position: 'absolute', top: '50%', left: '50%' }}
      >
        <section className={className} {...props} />
      </LiquidGlass>
    </div>
  );
}

function DismissLayer({ onDismiss }: { onDismiss(): void }) {
  return (
    <button
      aria-label="关闭 IntelliFlow 切换器"
      className="if-overlay-dismiss-layer"
      onClick={onDismiss}
      tabIndex={-1}
      type="button"
    />
  );
}
