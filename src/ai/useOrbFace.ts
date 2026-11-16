import { useEffect, type RefObject } from 'react';

export const orbMotion = {
  trackingRadius: 3.5,
  eyeTravelX: 0.14,
  eyeTravelY: 0.1,
  edgeResistance: 3,
  followTime: 85,
  blinkMinDelay: 2800,
  blinkMaxDelay: 7000,
  blinkDuration: 180,
} as const;

type Point = { x: number; y: number };

export function useOrbFace(ref: RefObject<HTMLSpanElement | null>) {
  useEffect(() => {
    const face = ref.current;
    if (!face) return;

    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionPreference.matches;
    let inView = false;
    let pointer: Point | null = null;
    let current: Point = { x: 0, y: 0 };
    let tracking = false;
    let frame = 0;
    let lastFrame = 0;
    let blinkTimer = 0;
    let blinkEnd = 0;
    const active = () => inView && !document.hidden;

    function paint() {
      face!.style.setProperty('--eye-x', `${current.x.toFixed(3)}px`);
      face!.style.setProperty('--eye-y', `${current.y.toFixed(3)}px`);
    }

    function stopBlink() {
      clearTimeout(blinkTimer);
      clearTimeout(blinkEnd);
      blinkTimer = 0;
      blinkEnd = 0;
      delete face!.dataset.blinking;
    }

    function scheduleBlink() {
      if (!active() || tracking || reducedMotion || blinkTimer || blinkEnd) return;
      const delay =
        orbMotion.blinkMinDelay +
        Math.random() * (orbMotion.blinkMaxDelay - orbMotion.blinkMinDelay);
      blinkTimer = window.setTimeout(() => {
        blinkTimer = 0;
        if (!active() || tracking || reducedMotion) return;
        face!.dataset.blinking = 'true';
        blinkEnd = window.setTimeout(() => {
          blinkEnd = 0;
          delete face!.dataset.blinking;
          scheduleBlink();
        }, orbMotion.blinkDuration);
      }, delay);
    }

    function updateTracking(next: boolean) {
      if (next === tracking) return;
      tracking = next;
      face!.dataset.tracking = String(next);
      if (next) stopBlink();
      else scheduleBlink();
    }

    function animate(now: number) {
      frame = 0;
      if (!active()) return;
      const bounds = face!.getBoundingClientRect();
      const diameter = Math.min(bounds.width, bounds.height);
      const dx = pointer ? pointer.x - (bounds.left + bounds.width / 2) : 0;
      const dy = pointer ? pointer.y - (bounds.top + bounds.height / 2) : 0;
      const distance = Math.hypot(dx, dy);
      const radius = diameter * orbMotion.trackingRadius;
      updateTracking(!!pointer && diameter > 0 && distance <= radius);

      let target: Point = { x: 0, y: 0 };
      if (tracking && distance > 0) {
        // The derivative decreases exponentially as the gaze approaches its limit.
        const resistance = orbMotion.edgeResistance;
        const reach =
          (1 - Math.exp((-resistance * distance) / radius)) / (1 - Math.exp(-resistance));
        target = {
          x: (dx / distance) * reach * diameter * orbMotion.eyeTravelX,
          y: (dy / distance) * reach * diameter * orbMotion.eyeTravelY,
        };
      }

      const elapsed = lastFrame ? Math.min(now - lastFrame, 48) : 16;
      lastFrame = now;
      const blend = reducedMotion ? 1 : 1 - Math.exp(-elapsed / orbMotion.followTime);
      current.x += (target.x - current.x) * blend;
      current.y += (target.y - current.y) * blend;
      const settled = Math.hypot(target.x - current.x, target.y - current.y) < 0.015;
      if (settled) current = target;
      paint();
      if (!settled) frame = requestAnimationFrame(animate);
      else lastFrame = 0;
    }

    function wake() {
      if (active() && !frame) frame = requestAnimationFrame(animate);
    }

    function resetPointer() {
      pointer = null;
      updateTracking(false);
      wake();
    }

    function move(event: PointerEvent) {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
        if (pointer) resetPointer();
        return;
      }
      pointer = { x: event.clientX, y: event.clientY };
      wake();
    }

    function leaveWindow(event: PointerEvent) {
      if (!event.relatedTarget) resetPointer();
    }

    function synchronize() {
      if (active()) {
        wake();
        scheduleBlink();
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        lastFrame = 0;
        pointer = null;
        updateTracking(false);
        stopBlink();
        current = { x: 0, y: 0 };
        paint();
      }
    }

    function preferenceChanged() {
      reducedMotion = motionPreference.matches;
      stopBlink();
      synchronize();
    }

    const visibility = new IntersectionObserver(([entry]) => {
      inView =
        entry.isIntersecting &&
        entry.intersectionRect.width > 0 &&
        entry.intersectionRect.height > 0;
      synchronize();
    });
    const resize = new ResizeObserver(wake);
    visibility.observe(face);
    resize.observe(face);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerout', leaveWindow, { passive: true });
    window.addEventListener('blur', resetPointer);
    window.addEventListener('resize', wake);
    window.addEventListener('scroll', wake, true);
    document.addEventListener('visibilitychange', synchronize);
    motionPreference.addEventListener('change', preferenceChanged);

    return () => {
      cancelAnimationFrame(frame);
      stopBlink();
      visibility.disconnect();
      resize.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerout', leaveWindow);
      window.removeEventListener('blur', resetPointer);
      window.removeEventListener('resize', wake);
      window.removeEventListener('scroll', wake, true);
      document.removeEventListener('visibilitychange', synchronize);
      motionPreference.removeEventListener('change', preferenceChanged);
    };
  }, [ref]);
}
