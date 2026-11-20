import { useLayoutEffect } from 'react';

// The visual viewport also accounts for an on-screen keyboard on browsers that
// do not resize the layout viewport. Do not reflow the app during pinch zoom.
export function useViewport() {
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      if (viewport && viewport.scale !== 1) return;
      document.documentElement.style.setProperty(
        '--viewport-height',
        `${viewport?.height ?? innerHeight}px`,
      );
      document.documentElement.style.setProperty('--viewport-top', `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    window.addEventListener('resize', update);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--viewport-height');
      document.documentElement.style.removeProperty('--viewport-top');
    };
  }, []);
}
