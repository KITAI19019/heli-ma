import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { clamp } from './settings';

type Position = { x: number; y: number };
export function useOrb(saved: Position, size: number, onSave: (position: Position) => void) {
  const [position, setPosition] = useState(saved);
  const [viewport, setViewport] = useState({ width: innerWidth, height: innerHeight });
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    start: Position;
    last: Position;
    moved: boolean;
  } | null>(null);
  const dragged = useRef(false);
  useEffect(() => setPosition(saved), [saved.x, saved.y]);
  useEffect(() => {
    const update = () =>
      setViewport({
        width: window.visualViewport?.width ?? innerWidth,
        height: window.visualViewport?.height ?? innerHeight,
      });
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  const width = Math.max(1, viewport.width - size - 24);
  const height = Math.max(1, viewport.height - size - 24);
  return {
    style: {
      width: size,
      height: size,
      left: 12 + position.x * width,
      top: 12 + position.y * height,
    },
    onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
      if (!event.isPrimary || event.button !== 0) return;
      dragged.current = false;
      gesture.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        start: position,
        last: position,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
      const current = gesture.current;
      if (!current || current.id !== event.pointerId) return;
      const dx = event.clientX - current.x;
      const dy = event.clientY - current.y;
      if (Math.hypot(dx, dy) > 6) current.moved = true;
      if (!current.moved) return;
      event.preventDefault();
      current.last = {
        x: clamp(current.start.x + dx / width, 0, 1),
        y: clamp(current.start.y + dy / height, 0, 1),
      };
      setPosition(current.last);
    },
    onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
      const current = gesture.current;
      if (!current || current.id !== event.pointerId) return;
      gesture.current = null;
      dragged.current = current.moved;
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      if (current.moved) onSave(current.last);
    },
    onPointerCancel() {
      gesture.current = null;
      dragged.current = true;
      setPosition(saved);
    },
    consumeDrag() {
      const moved = dragged.current;
      dragged.current = false;
      return moved;
    },
  };
}
