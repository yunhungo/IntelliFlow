import { AdapterError, type SiteAdapter } from '../adapters/site-adapter';
import {
  nextEnabledOption,
  type SwitchResult,
  type SwitchSnapshot,
  type SwitchTarget,
  withSelectedOption,
} from '../domain/switching';
import { SwitchStateCache } from './state-cache';
import type { OverlayPort } from './switch-coordinator';

interface ShortcutSession {
  id: number;
  target: SwitchTarget;
  advancesWhileLoading: number;
  releaseRequested: boolean;
  committing: boolean;
  unavailable: boolean;
  snapshot?: SwitchSnapshot;
  selectedId?: string;
}

export class ShortcutSessionCoordinator {
  private active: ShortcutSession | undefined;
  private nextSessionId = 1;

  constructor(
    private readonly adapter: SiteAdapter,
    private readonly overlay: OverlayPort,
    private readonly stateCache = new SwitchStateCache(),
  ) {}

  advance(target: SwitchTarget): void {
    if (this.active?.committing) return;

    if (this.active?.target !== target) {
      this.cancel();
      this.start(target);
      return;
    }

    if (this.active.unavailable) return;

    if (this.active.snapshot == null) {
      this.active.advancesWhileLoading += 1;
      return;
    }

    this.advanceLoadedSession(this.active);
  }

  release(): void {
    const session = this.active;
    if (session == null || session.committing) return;
    session.releaseRequested = true;
    this.overlay.hide();
    if (session.snapshot != null) {
      void this.commit(session);
    } else if (session.unavailable) {
      this.active = undefined;
    }
  }

  select(target: SwitchTarget, optionId: string): boolean {
    const session = this.active;
    if (session?.target !== target || session.snapshot == null || session.committing) return false;

    const option = session.snapshot.options.find(
      (candidate) => candidate.id === optionId && !candidate.disabled,
    );
    if (option == null) return false;

    session.selectedId = option.id;
    this.overlay.hide();
    void this.commit(session);
    return true;
  }

  cancel(): void {
    this.active = undefined;
    this.overlay.hide();
  }

  private start(target: SwitchTarget): void {
    const session: ShortcutSession = {
      id: this.nextSessionId,
      target,
      advancesWhileLoading: 1,
      releaseRequested: false,
      committing: false,
      unavailable: false,
    };
    this.nextSessionId += 1;
    this.active = session;

    if (target === 'model') {
      const cached = this.stateCache.get(target);
      if (cached != null) {
        this.attachSnapshot(session, cached);
        return;
      }
    }

    if (target === 'model') this.overlay.showPending(target);
    void this.load(session);
  }

  private async load(session: ShortcutSession): Promise<void> {
    let currentModel: string | undefined;
    try {
      if (session.target === 'reasoning') {
        currentModel = await this.adapter.readCurrent('model');
        if (this.active?.id !== session.id) return;
        this.stateCache.confirmModel(currentModel);

        const cached = this.stateCache.get('reasoning');
        if (cached != null) {
          this.attachSnapshot(session, cached);
          return;
        }
      }

      const snapshot = await this.adapter.observe(session.target);
      if (this.active?.id !== session.id) return;
      this.stateCache.set(snapshot);
      this.attachSnapshot(session, snapshot);
    } catch (error) {
      if (this.active?.id !== session.id) return;
      if (error instanceof AdapterError && error.code === 'target-unavailable') {
        if (session.releaseRequested) {
          this.active = undefined;
          this.overlay.hide();
          return;
        }
        session.unavailable = true;
        this.overlay.showUnavailable(currentModel ?? '当前模型', false);
        return;
      }
      this.active = undefined;
      if (!session.releaseRequested) {
        this.overlay.showError(
          error instanceof Error ? error.message : 'IntelliFlow could not read this menu.',
        );
      }
    }
  }

  private attachSnapshot(session: ShortcutSession, snapshot: SwitchSnapshot): void {
    session.snapshot = snapshot;
    session.selectedId = snapshot.options.find((option) => option.selected)?.id;

    for (let index = 0; index < session.advancesWhileLoading; index += 1) {
      const next = nextEnabledOption(snapshot.options, session.selectedId);
      if (next != null) session.selectedId = next.id;
    }
    session.advancesWhileLoading = 0;

    if (session.selectedId == null) {
      this.active = undefined;
      this.overlay.showError('ChatGPT returned no selectable options.');
      return;
    }

    if (session.releaseRequested) {
      void this.commit(session);
      return;
    }

    this.overlay.showPreview(toPreviewResult(snapshot, session.selectedId), false);
  }

  private advanceLoadedSession(session: ShortcutSession): void {
    const snapshot = session.snapshot;
    if (snapshot == null) return;
    const next = nextEnabledOption(snapshot.options, session.selectedId);
    if (next == null) return;
    session.selectedId = next.id;
    this.overlay.showPreview(toPreviewResult(snapshot, next.id), false);
  }

  private async commit(session: ShortcutSession): Promise<void> {
    if (this.active?.id !== session.id || session.snapshot == null || session.selectedId == null) {
      return;
    }

    session.committing = true;
    this.overlay.hide();

    const originalSelection = session.snapshot.options.find((option) => option.selected)?.id;
    if (session.selectedId === originalSelection) {
      this.active = undefined;
      return;
    }

    try {
      const result = await this.adapter.select(session.target, session.selectedId);
      if (this.active?.id !== session.id) return;
      this.stateCache.set(result);
      this.active = undefined;
    } catch {
      if (this.active?.id !== session.id) return;
      this.active = undefined;
    }
  }
}

function toPreviewResult(snapshot: SwitchSnapshot, selectedId: string): SwitchResult {
  const selected = snapshot.options.find((option) => option.id === selectedId);
  const current = selected?.label ?? snapshot.current;
  return {
    ...snapshot,
    current,
    options: withSelectedOption(snapshot.options, selectedId),
    previous: snapshot.current,
    changed: current !== snapshot.current,
  };
}
