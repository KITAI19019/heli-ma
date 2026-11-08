import { useLayoutEffect } from 'react';

// The visual viewport also accounts for an on-screen keyboard on browsers that
// do not resize the layout viewport. Do not reflow the app during pinch zoom.
export function useViewport() {
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      if (viewport && viewport.scale !== 1) return;
      document.documentElement.style.setProperty('--viewport-height', `${viewport?.height ?? innerHeight}px`);
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

export function useFittedDescriptions(page: string) {
  useLayoutEffect(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('.type-card, .matrix-head, .matrix-rowhead')];
    const update = () => cards.forEach(card => {
      card.removeAttribute('data-compact');
      const body = card.querySelector<HTMLElement>('.method-body');
      const style = getComputedStyle(card);
      const available = card.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const secondary = card.querySelector<HTMLElement>('small');
      const box = card.getBoundingClientRect();
      const text = secondary?.getBoundingClientRect();
      if ((body && body.scrollHeight > available + 1) || (text && (text.top < box.top || text.bottom > box.bottom || card.scrollHeight > card.clientHeight + 1))) card.dataset.compact = 'true';
    });
    const observer = new ResizeObserver(update);
    cards.forEach(card => observer.observe(card));
    update();
    return () => observer.disconnect();
  }, [page]);
}
