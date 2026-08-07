import type { OverlayPort } from '../../application/switch-coordinator';
import type { SwitchResult, SwitchTarget } from '../../domain/switching';

export type OverlayState =
  | { visible: false }
  | { visible: true; closing: boolean; kind: 'pending'; target: SwitchTarget }
  | {
      visible: true;
      closing: boolean;
      kind: 'preview';
      result: SwitchResult;
      committing: boolean;
    }
  | { visible: true; closing: boolean; kind: 'result'; result: SwitchResult }
  | { visible: true; closing: boolean; kind: 'unavailable'; modelName: string }
  | { visible: true; closing: boolean; kind: 'error'; message: string };

type Listener = () => void;

export class OverlayController implements OverlayPort {
  private state: OverlayState = { visible: false };
  private readonly listeners = new Set<Listener>();
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly visibleDurationMs = 1_800,
    private readonly closeDurationMs = 150,
  ) {}

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): OverlayState => this.state;

  showPending(target: SwitchTarget): void {
    if (this.hideTimer != null) clearTimeout(this.hideTimer);
    this.hideTimer = undefined;
    this.setState({ visible: true, closing: false, kind: 'pending', target });
  }

  showResult(result: SwitchResult): void {
    this.setState({ visible: true, closing: false, kind: 'result', result });
    this.scheduleHide();
  }

  showPreview(result: SwitchResult, committing: boolean): void {
    if (this.hideTimer != null) clearTimeout(this.hideTimer);
    this.hideTimer = undefined;
    this.setState({ visible: true, closing: false, kind: 'preview', result, committing });
  }

  showUnavailable(modelName: string, autoHide = true): void {
    if (this.hideTimer != null) clearTimeout(this.hideTimer);
    this.hideTimer = undefined;
    this.setState({ visible: true, closing: false, kind: 'unavailable', modelName });
    if (autoHide) this.scheduleHide();
  }

  showError(message: string): void {
    this.setState({ visible: true, closing: false, kind: 'error', message });
    this.scheduleHide(2_800);
  }

  hide = (): void => {
    if (!this.state.visible || this.state.closing) return;
    if (this.hideTimer != null) clearTimeout(this.hideTimer);
    this.setState({ ...this.state, closing: true });
    this.hideTimer = setTimeout(() => {
      this.hideTimer = undefined;
      this.setState({ visible: false });
    }, this.closeDurationMs);
  };

  private scheduleHide(durationMs = this.visibleDurationMs): void {
    if (this.hideTimer != null) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(this.hide, durationMs);
  }

  private setState(state: OverlayState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
