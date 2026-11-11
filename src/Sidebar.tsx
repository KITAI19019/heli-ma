import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { lockBodyScroll } from './scrollLock';

type CloseSidebar = (onStart?: () => void, immediate?: boolean) => void;
type Gesture = {
  id: number;
  x: number;
  y: number;
  width: number;
  start: number;
  progress: number;
  axis: 'pending' | 'horizontal' | 'vertical';
  lastX: number;
  lastTime: number;
  velocity: number;
};
const blurLayers = [
  { radius: 1, start: 55, end: 100 },
  { radius: 2, start: 35, end: 85 },
  { radius: 4, start: 20, end: 65 },
  { radius: 8, start: 10, end: 45 },
  { radius: 16, start: 0, end: 25 },
];

export function Sidebar({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: (close: CloseSidebar) => ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const releaseScroll = useRef<(() => void) | undefined>(undefined);
  const synchronizeExit = useRef(false);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  const finishClose = useCallback(() => {
    dialog.current?.close();
    releaseScroll.current?.();
    releaseScroll.current = undefined;
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    let frame = 0;
    let timer = 0;
    gesture.current = null;
    setDragging(false);
    if (open) {
      if (!element.open) {
        releaseScroll.current = lockBodyScroll();
        setProgress(0);
        element.showModal();
      }
      // Render the offscreen position before starting the entrance transition.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setProgress(1));
      });
    } else if (element.open) {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setProgress(0);
        finishClose();
      } else {
        // Match the incoming page's initial-paint frames so both transforms start together.
        if (synchronizeExit.current)
          frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => setProgress(0));
          });
        else setProgress(0);
        timer = window.setTimeout(finishClose, 360);
      }
      synchronizeExit.current = false;
    }
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [open, finishClose]);

  useEffect(
    () => () => {
      finishClose();
    },
    [finishClose],
  );

  const close: CloseSidebar = (action, immediate = false) => {
    if (!open) return;
    synchronizeExit.current = !immediate && Boolean(action);
    if (immediate) finishClose();
    onClose();
    action?.();
  };
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!open || !event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    const bounds = event.currentTarget.getBoundingClientRect();
    const start = Math.max(0, Math.min(1, bounds.right / bounds.width));
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      width: bounds.width,
      start,
      progress: start,
      axis: 'pending',
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
    };
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || current.axis === 'vertical') return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (current.axis === 'pending') {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 7) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        current.axis = 'vertical';
        return;
      }
      if (dx >= 0) return;
      current.axis = 'horizontal';
      suppressClick.current = true;
      // Touch already has implicit capture on the pressed child; its events continue bubbling to this panel.
      if (event.pointerType === 'mouse') event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    current.progress = Math.max(0, Math.min(1, current.start + dx / current.width));
    current.velocity =
      (event.clientX - current.lastX) / Math.max(1, event.timeStamp - current.lastTime);
    current.lastX = event.clientX;
    current.lastTime = event.timeStamp;
    setProgress(current.progress);
  }
  function endDrag(event: PointerEvent<HTMLDivElement>, canceled = false) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    if (current.axis !== 'horizontal') return;
    setDragging(false);
    const velocity = event.timeStamp - current.lastTime < 100 ? current.velocity : 0;
    const moved = (current.start - current.progress) * current.width;
    if (!canceled && (current.progress < 0.7 || (moved > 24 && velocity < -0.5))) close();
    else setProgress(1);
  }

  return (
    <dialog
      id="navigation-sidebar"
      className="sidebar-overlay"
      ref={dialog}
      aria-labelledby="sidebar-title"
      data-dragging={dragging}
      style={{ ['--sidebar-progress' as string]: progress }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
        );
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className="sidebar-blur" aria-hidden="true">
        {blurLayers.map((layer) => (
          <span
            key={layer.radius}
            className="sidebar-blur-layer"
            style={{
              ['--blur' as string]: `${layer.radius}px`,
              ['--fade-start' as string]: `${layer.start}%`,
              ['--fade-end' as string]: `${layer.end}%`,
            }}
          />
        ))}
      </div>
      <div className="sidebar-backdrop" aria-hidden="true" onClick={() => close()} />
      <div
        className="sidebar"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={(event) => endDrag(event)}
        onPointerCancel={(event) => endDrag(event, true)}
        onLostPointerCapture={(event) => {
          // A child's implicit touch-capture release must not cancel the panel's gesture.
          if (event.target === event.currentTarget) endDrag(event, true);
        }}
        onClickCapture={(event) => {
          if (suppressClick.current && event.detail !== 0) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget && event.propertyName === 'transform' && !open)
            finishClose();
        }}
      >
        <div className="sidebar-heading">
          <h2 id="sidebar-title">导航</h2>
          <button className="icon-button" onClick={() => close()} aria-label="关闭侧边栏" autoFocus>
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children(close)}
      </div>
    </dialog>
  );
}
