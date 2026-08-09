import type { SwitchResult, SwitchSnapshot, SwitchTarget } from '../domain/switching';

interface CacheEntry {
  snapshot: SwitchSnapshot;
  expiresAt?: number;
}

export class SwitchStateCache {
  private readonly entries = new Map<SwitchTarget, CacheEntry>();
  private modelIdentity: string | undefined;
  private reasoningModelIdentity: string | undefined;
  private unavailableReasoningModelIdentity: string | undefined;

  constructor(
    private readonly modelTtlMs = 30_000,
    private readonly now: () => number = Date.now,
  ) {}

  get(target: SwitchTarget): SwitchSnapshot | undefined {
    const entry = this.entries.get(target);
    if (entry == null) return undefined;

    if (
      target === 'reasoning' &&
      (this.modelIdentity == null || !sameIdentity(this.reasoningModelIdentity, this.modelIdentity))
    ) {
      return undefined;
    }

    if (target === 'model' && entry.expiresAt != null && entry.expiresAt <= this.now()) {
      return undefined;
    }

    return entry.snapshot;
  }

  set(snapshot: SwitchSnapshot | SwitchResult): void {
    if (snapshot.target === 'model') {
      const previousModel = this.entries.get('model')?.snapshot;
      const changedByAction = 'changed' in snapshot && snapshot.changed;
      const changedWhileObserving =
        previousModel != null && previousModel.current !== snapshot.current;

      if (changedByAction || changedWhileObserving) {
        this.invalidateReasoning();
      }

      this.confirmModel(snapshot.current);

      this.entries.set('model', {
        snapshot,
        expiresAt: this.now() + this.modelTtlMs,
      });
      return;
    }

    this.entries.set('reasoning', { snapshot });
    this.reasoningModelIdentity = this.modelIdentity;
    this.unavailableReasoningModelIdentity = undefined;
  }

  getUnavailableReasoningModel(): string | undefined {
    if (!sameIdentity(this.unavailableReasoningModelIdentity, this.modelIdentity)) return undefined;
    return this.unavailableReasoningModelIdentity;
  }

  markReasoningUnavailable(modelName: string): void {
    this.confirmModel(modelName);
    this.entries.delete('reasoning');
    this.reasoningModelIdentity = undefined;
    this.unavailableReasoningModelIdentity = modelName;
  }

  confirmModel(current: string): void {
    if (this.modelIdentity != null && !sameIdentity(this.modelIdentity, current)) {
      this.entries.delete('model');
      this.invalidateReasoning();
    }
    this.modelIdentity = current;
  }

  private invalidateReasoning(): void {
    this.entries.delete('reasoning');
    this.reasoningModelIdentity = undefined;
    this.unavailableReasoningModelIdentity = undefined;
  }
}

function sameIdentity(left: string | undefined, right: string | undefined): boolean {
  if (left == null || right == null) return false;
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  return normalize(left) === normalize(right);
}
