import { useEffect, useRef, useState, type ReactNode } from 'react';
import { lockBodyScroll } from './scrollLock';

export function UtilityScreen({
  visible,
  onExited,
  children,
}: {
  visible: boolean;
  onExited: () => void;
  children: ReactNode;
}) {
  const screen = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);
  const exit = useRef(onExited);
  exit.current = onExited;

  useEffect(() => {
    const releaseScroll = lockBodyScroll();
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(frame);
      releaseScroll();
    };
  }, []);

  useEffect(() => {
    if (visible) return;
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300;
    const timer = window.setTimeout(() => exit.current(), delay);
    return () => clearTimeout(timer);
  }, [visible]);

  function finishTransition() {
    if (!visible) exit.current();
    else screen.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }

  return (
    <section
      ref={screen}
      className="utility-screen"
      data-visible={entered && visible}
      inert={!visible || undefined}
      aria-label="设置页面"
      onTransitionEnd={(event) => {
        if (
          event.target === event.currentTarget.firstElementChild &&
          event.propertyName === 'opacity'
        )
          finishTransition();
      }}
    >
      <div className="app-shell">{children}</div>
    </section>
  );
}
