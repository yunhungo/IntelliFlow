export function registerWindowBlurCancellation(
  windowTarget: Window,
  cancel: () => void,
): () => void {
  windowTarget.addEventListener('blur', cancel);
  return () => windowTarget.removeEventListener('blur', cancel);
}
