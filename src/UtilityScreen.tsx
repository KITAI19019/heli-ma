import { useEffect, useRef, useState, type ReactNode } from 'react';
import { lockBodyScroll } from './scrollLock';

export function UtilityScreen({
  visible,
  onExited,
  children,
  instant = false,
}: {
  visible: boolean;
  onExited: () => void;
  children: ReactNode;
  instant?: boolean;
}) {
  const screen = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);
  const exit = useRef(onExited);
  exit.current = onExited;

  useEffect(() => {
    const releaseScroll = lockBodyScroll();
    if (instant) return releaseScroll;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(frame);
      releaseScroll();
    };
  }, [instant]);

  useEffect(() => {
    if (visible || instant) return;
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360;
    const timer = window.setTimeout(() => exit.current(), delay);
    return () => clearTimeout(timer);
  }, [visible, instant]);

  function finishTransition() {
    if (!visible) exit.current();
    else screen.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }

  return (
    <section
      ref={screen}
      className="utility-screen"
      data-visible={(instant || entered) && visible}
      data-instant={instant || undefined}
      aria-label="设置页面"
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === 'transform')
          finishTransition();
      }}
    >
      <div className="app-shell">{children}</div>
    </section>
  );
}
