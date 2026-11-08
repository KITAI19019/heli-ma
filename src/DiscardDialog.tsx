import { useEffect, useRef } from 'react';
import { lockBodyScroll } from './scrollLock';

export type DiscardRequest = { title?: string; cancelText?: string; message: string; confirmText: string; onConfirm: () => void };

export function DiscardDialog({ request, onCancel, onConfirm }: {
  request: DiscardRequest;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const releaseScroll = useRef<() => void>(() => {});

  useEffect(() => {
    const element = dialog.current!;
    releaseScroll.current = lockBodyScroll();
    element.showModal();
    return () => { element.close(); releaseScroll.current(); };
  }, []);

  function choose(action: () => void) {
    dialog.current?.close();
    releaseScroll.current();
    action();
  }

  return <dialog ref={dialog} className="discard-overlay" aria-labelledby="discard-title" aria-describedby="discard-description"
    onCancel={event => { event.preventDefault(); choose(onCancel); }}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button');
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onClick={event => { if (event.target === event.currentTarget) choose(onCancel); }}>
    <div className="discard-card">
      <h2 id="discard-title">{request.title ?? '放弃本次输入？'}</h2>
      <p id="discard-description">{request.message}</p>
      <div className="discard-actions">
        <button autoFocus onClick={() => choose(onCancel)}>{request.cancelText ?? '继续编辑'}</button>
        <button className="discard-action" onClick={() => choose(onConfirm)}>{request.confirmText}</button>
      </div>
    </div>
  </dialog>;
}
