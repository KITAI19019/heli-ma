import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { clamp } from './settings';
import { useOrbAvoidance } from './useOrbAvoidance';
import { orbSpacing } from './orbPlacement';

type Position = { x: number; y: number };
export function useOrb(
  saved: Position,
  size: number,
  onSave: (position: Position) => void,
  ref: RefObject<HTMLButtonElement | null>,
  visible: boolean,
) {
  const [position, setPosition] = useState(saved);
  const [dragging, setDragging] = useState(false);
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
    const update = () => {
      if (window.visualViewport && window.visualViewport.scale !== 1) return;
      setViewport({
        width: window.visualViewport?.width ?? innerWidth,
        height: window.visualViewport?.height ?? innerHeight,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  const margin = orbSpacing.edge;
  const width = Math.max(1, viewport.width - size - margin * 2);
  const height = Math.max(1, viewport.height - size - margin * 2);
  const displayed = useOrbAvoidance(
    ref,
    { x: margin + position.x * width, y: margin + position.y * height },
    size,
    visible,
    dragging,
  );
  function cancel() {
    if (!gesture.current) return;
    gesture.current = null;
    dragged.current = true;
    setDragging(false);
    setPosition(saved);
  }
  return {
    dragging,
    style: {
      width: size,
      height: size,
      left: displayed.x,
      top: displayed.y,
    },
    onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
      if (!event.isPrimary || event.button !== 0) return;
      // Drag from the rendered position, including any temporary avoidance offset.
      const bounds = event.currentTarget.getBoundingClientRect();
      const layer = event.currentTarget.parentElement!.getBoundingClientRect();
      const start = {
        x: clamp((bounds.left - layer.left - margin) / width, 0, 1),
        y: clamp((bounds.top - layer.top - margin) / height, 0, 1),
      };
      dragged.current = false;
      setPosition(start);
      setDragging(true);
      gesture.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        start,
        last: start,
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
      setDragging(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      if (current.moved) onSave(current.last);
      else setPosition(saved);
    },
    onPointerCancel: cancel,
    onLostPointerCapture: cancel,
    consumeDrag() {
      const moved = dragged.current;
      dragged.current = false;
      return moved;
    },
  };
}
