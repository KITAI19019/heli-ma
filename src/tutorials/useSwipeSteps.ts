import { useRef, useState, type PointerEvent } from 'react';

interface SwipeGesture {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
  width: number;
  horizontal: boolean;
}

export function useSwipeSteps(count: number) {
  const [stepIndex, setStepIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<SwipeGesture | null>(null);

  function goToStep(index: number) {
    gesture.current = null;
    setDragging(false);
    setDragOffset(0);
    setStepIndex(Math.max(0, Math.min(count - 1, index)));
  }

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.pointerType === 'mouse') return;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: event.timeStamp,
      width: event.currentTarget.clientWidth,
      horizontal: false,
    };
  }

  function moveSwipe(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const distance = event.clientX - current.startX;
    const verticalDistance = event.clientY - current.startY;

    if (!current.horizontal) {
      if (Math.max(Math.abs(distance), Math.abs(verticalDistance)) < 8) return;
      if (Math.abs(verticalDistance) >= Math.abs(distance)) {
        gesture.current = null;
        return;
      }
      current.horizontal = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }

    if (event.cancelable) event.preventDefault();
    const atBoundary =
      (stepIndex === 0 && distance > 0) || (stepIndex === count - 1 && distance < 0);
    const offset = Math.max(-current.width, Math.min(current.width, distance));
    setDragOffset(atBoundary ? offset * 0.2 : offset);
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const distance = event.clientX - current.startX;
    const elapsed = Math.max(1, event.timeStamp - current.startedAt);
    const threshold = Math.min(72, current.width * 0.2);
    const intentionalSwipe =
      Math.abs(distance) >= threshold ||
      (Math.abs(distance) > 24 && Math.abs(distance) / elapsed > 0.5);
    const next =
      !cancelled && current.horizontal && intentionalSwipe
        ? stepIndex + (distance < 0 ? 1 : -1)
        : stepIndex;
    goToStep(next);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return {
    stepIndex,
    dragOffset,
    dragging,
    goToStep,
    swipeHandlers: {
      onPointerDown: startSwipe,
      onPointerMove: moveSwipe,
      onPointerUp: (event: PointerEvent<HTMLDivElement>) => finishSwipe(event),
      onPointerCancel: (event: PointerEvent<HTMLDivElement>) => finishSwipe(event, true),
      onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => {
        // A child's implicit touch capture bubbles here when the slider takes over.
        if (event.target === event.currentTarget) finishSwipe(event, true);
      },
    },
  };
}
