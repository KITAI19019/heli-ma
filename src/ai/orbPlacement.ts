import { clamp } from './settings';

export type Point = { x: number; y: number };
export type Rect = { left: number; top: number; right: number; bottom: number };
export const orbSpacing = { edge: 12, content: 8 } as const;

const overlap = (point: Point, size: number, rect: Rect) =>
  Math.max(0, Math.min(point.x + size, rect.right) - Math.max(point.x, rect.left)) *
  Math.max(0, Math.min(point.y + size, rect.bottom) - Math.max(point.y, rect.top));

// Sweep the content boundaries, then choose the nearest free horizontal interval.
// This also finds narrow gaps between several containers without a pixel-by-pixel search.
export function placeOrb(start: Point, size: number, area: Rect, content: Rect[]): Point {
  const minX = area.left + orbSpacing.edge;
  const minY = area.top + orbSpacing.edge;
  const maxX = Math.max(minX, area.right - size - orbSpacing.edge);
  const maxY = Math.max(minY, area.bottom - size - orbSpacing.edge);
  const origin = { x: clamp(start.x, minX, maxX), y: clamp(start.y, minY, maxY) };
  const obstacles = content.map((rect) => ({
    left: rect.left - orbSpacing.content,
    top: rect.top - orbSpacing.content,
    right: rect.right + orbSpacing.content,
    bottom: rect.bottom + orbSpacing.content,
  }));
  if (obstacles.every((rect) => overlap(origin, size, rect) < 0.01)) return origin;

  const rows = new Set([origin.y, minY, maxY]);
  for (const rect of obstacles) {
    rows.add(clamp(rect.top - size, minY, maxY));
    rows.add(clamp(rect.bottom, minY, maxY));
  }
  let best: Point | null = null;
  let distance = Infinity;
  const consider = (left: number, right: number, y: number) => {
    if (right < left) return;
    const point = { x: clamp(origin.x, left, right), y };
    const next = (point.x - origin.x) ** 2 + (point.y - origin.y) ** 2;
    if (next < distance) {
      best = point;
      distance = next;
    }
  };
  for (const y of rows) {
    const blocked = obstacles
      .filter((rect) => y < rect.bottom && y + size > rect.top)
      .map((rect) => ({ left: rect.left - size, right: rect.right }))
      .filter((rect) => rect.right > minX && rect.left < maxX)
      .sort((a, b) => a.left - b.left);
    let left = minX;
    for (const rect of blocked) {
      if (rect.left >= left) consider(left, Math.min(rect.left, maxX), y);
      left = Math.max(left, rect.right);
      if (left > maxX) break;
    }
    if (left <= maxX) consider(left, maxX, y);
  }
  if (best) return best;

  // A very crowded screen may have no free spot. Keep the button reachable at
  // the least obstructive edge instead of hiding it or moving back and forth.
  let covered = Infinity;
  for (const y of rows) {
    for (const x of [minX, maxX]) {
      const point = { x, y };
      const next = obstacles.reduce((sum, rect) => sum + overlap(point, size, rect), 0);
      const travel = (x - origin.x) ** 2 + (y - origin.y) ** 2;
      if (next < covered || (next === covered && travel < distance)) {
        best = point;
        covered = next;
        distance = travel;
      }
    }
  }
  return best ?? origin;
}

const containers =
  'button, a[href], label, p, h1, h2, h3, h4, h5, h6, li, figcaption, legend, .node, .matrix-cell, .tutorial-figure, [data-orb-obstacle]';

export function textObstacles(area: Rect): Rect[] {
  const result: Rect[] = [];
  const seen = new Set<Element>();
  const styles = new Map<Element, CSSStyleDeclaration>();
  const style = (element: Element) => {
    if (!styles.has(element)) styles.set(element, getComputedStyle(element));
    return styles.get(element)!;
  };
  function add(element: Element, bounds: DOMRect) {
    if (element.closest('.ai-layer, [hidden], [inert], script, style')) return;
    if (style(element).visibility !== 'visible' || !element.getClientRects().length) return;
    const rect = {
      left: Math.max(area.left, bounds.left),
      top: Math.max(area.top, bounds.top),
      right: Math.min(area.right, bounds.right),
      bottom: Math.min(area.bottom, bounds.bottom),
    };
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const css = style(parent);
      if (css.overflowX === 'visible' && css.overflowY === 'visible') continue;
      const clip = parent.getBoundingClientRect();
      if (css.overflowX !== 'visible') {
        rect.left = Math.max(rect.left, clip.left);
        rect.right = Math.min(rect.right, clip.right);
      }
      if (css.overflowY !== 'visible') {
        rect.top = Math.max(rect.top, clip.top);
        rect.bottom = Math.min(rect.bottom, clip.bottom);
      }
    }
    if (rect.right > rect.left && rect.bottom > rect.top) result.push(rect);
  }
  for (const element of document.querySelectorAll(
    'input, textarea, select, button, [contenteditable="true"]',
  )) {
    seen.add(element);
    add(element, element.getBoundingClientRect());
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const text = walker.currentNode;
    const parent = text.parentElement;
    if (
      !parent ||
      !text.textContent?.trim() ||
      parent.closest('.ai-layer, [hidden], [inert], script, style')
    )
      continue;
    const container = parent.closest('[data-orb-obstacle]') ?? parent.closest(containers);
    if (container) {
      if (!seen.has(container)) add(container, container.getBoundingClientRect());
      seen.add(container);
    } else {
      range.selectNodeContents(text);
      for (const rect of range.getClientRects()) add(parent, rect);
    }
  }
  return result;
}
