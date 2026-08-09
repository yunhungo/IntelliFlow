import { AdapterError, type SiteAdapter } from '../adapters/site-adapter';
import type { ContentRequest, ContentResponse } from '../domain/messages';
import type { SiteState, SwitchResult, SwitchTarget } from '../domain/switching';
import { SwitchStateCache } from './state-cache';

export interface OverlayPort {
  showPending(target: SwitchTarget): void;
  showPreview(result: SwitchResult, committing: boolean): void;
  showResult(result: SwitchResult): void;
  showUnavailable(modelName: string, autoHide?: boolean): void;
  showError(message: string): void;
  hide(): void;
}

export class SwitchCoordinator {
  private queue: Promise<unknown> = Promise.resolve();
  private generation = 0;

  constructor(
    private readonly adapter: SiteAdapter,
    private readonly overlay: OverlayPort,
    private readonly stateCache = new SwitchStateCache(),
  ) {}

  handle(request: ContentRequest): Promise<ContentResponse> {
    const requestGeneration = this.generation;
    return this.enqueue(async () => {
      if (requestGeneration !== this.generation) return cancelledResponse();

      try {
        if (request.type === 'intelliflow:read-state') {
          const state = await this.readState();
          return { ok: true, state };
        }

        this.overlay.showPending(request.target);
        const result =
          request.type === 'intelliflow:switch'
            ? await this.adapter.cycle(request.target)
            : await this.adapter.select(request.target, request.optionId);

        if (requestGeneration !== this.generation) return cancelledResponse();
        this.stateCache.set(result);
        this.overlay.showResult(result);
        return { ok: true, result };
      } catch (error) {
        if (requestGeneration !== this.generation) return cancelledResponse();
        const message =
          error instanceof Error ? error.message : 'IntelliFlow could not switch state.';
        if (error instanceof AdapterError && error.code === 'target-unavailable') {
          const modelName =
            this.stateCache.getUnavailableReasoningModel() ??
            this.stateCache.get('model')?.current ??
            (await this.adapter.readCurrent('model').catch(() => '当前模型'));
          this.stateCache.markReasoningUnavailable(modelName);
          this.overlay.showUnavailable(modelName);
        } else {
          this.overlay.showError(message);
        }
        return {
          ok: false,
          error: message,
          code:
            typeof error === 'object' && error != null && 'code' in error
              ? String(error.code)
              : undefined,
        };
      }
    });
  }

  cancelPending(): void {
    this.generation += 1;
  }

  private async readState(): Promise<SiteState> {
    const model = await this.readSnapshot('model');
    const reasoning =
      this.stateCache.getUnavailableReasoningModel() == null
        ? await this.readSnapshot('reasoning').catch((error: unknown) => {
            if (error instanceof AdapterError && error.code === 'target-unavailable') {
              this.stateCache.markReasoningUnavailable(model.current);
              return undefined;
            }
            throw error;
          })
        : undefined;
    return {
      siteId: this.adapter.id,
      siteName: this.adapter.name,
      model,
      reasoning,
    };
  }

  private async readSnapshot(target: SwitchTarget) {
    const cached = this.stateCache.get(target);
    if (cached != null) return cached;

    const snapshot = await this.adapter.observe(target);
    this.stateCache.set(snapshot);
    return snapshot;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.queue.then(operation, operation);
    this.queue = run.catch(() => undefined);
    return run;
  }
}

function cancelledResponse(): ContentResponse {
  return {
    ok: false,
    error: 'The IntelliFlow operation was cancelled.',
    code: 'cancelled',
  };
}
