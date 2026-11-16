import { useEffect, useRef, useState, type RefObject } from 'react';
import { placeOrb, textObstacles, type Point } from './orbPlacement';

export function useOrbAvoidance(
  ref: RefObject<HTMLButtonElement | null>,
  preferred: Point,
  size: number,
  active: boolean,
  dragging: boolean,
) {
  const [position, setPosition] = useState(preferred);
  const current = useRef(preferred);
  const previous = useRef(preferred);

  useEffect(() => {
    const button = ref.current;
    if (!active || dragging || !button) return;
    if (previous.current.x !== preferred.x || previous.current.y !== preferred.y) {
      current.current = preferred;
      previous.current = preferred;
    }
    let frame = 0;
    let timer = 0;
    function measure() {
      frame = 0;
      if (document.hidden || !button!.getClientRects().length) return;
      const layer = button!.parentElement!.getBoundingClientRect();
      const area = { left: layer.left, top: layer.top, right: layer.right, bottom: layer.bottom };
      const next = placeOrb(
        { x: current.current.x + layer.left, y: current.current.y + layer.top },
        size,
        area,
        textObstacles(area),
      );
      current.current = { x: next.x - layer.left, y: next.y - layer.top };
      setPosition((old) =>
        Math.hypot(old.x - current.current.x, old.y - current.current.y) < 0.5
          ? old
          : current.current,
      );
    }
    function schedule() {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!frame) frame = requestAnimationFrame(measure);
      }, 80);
    }
    function changed(event: Event) {
      if (event.target instanceof Element && event.target.closest('.ai-layer, .ai-orb-face'))
        return;
      schedule();
    }
    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            !(
              record.target instanceof Element ? record.target : record.target.parentElement
            )?.closest('.ai-layer, .ai-orb-face'),
        )
      )
        schedule();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden', 'inert'],
    });
    frame = requestAnimationFrame(measure);
    for (const event of ['resize', 'scroll', 'input', 'change', 'transitionend', 'animationend'])
      window.addEventListener(event, changed, { capture: true, passive: true });
    document.addEventListener('visibilitychange', schedule);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      for (const event of ['resize', 'scroll', 'input', 'change', 'transitionend', 'animationend'])
        window.removeEventListener(event, changed, true);
      document.removeEventListener('visibilitychange', schedule);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [ref, preferred.x, preferred.y, size, active, dragging]);

  const changed = previous.current.x !== preferred.x || previous.current.y !== preferred.y;
  return dragging || changed ? preferred : position;
}
