import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

// Grow within the input page's remaining space, keeping the other field and
// navigation controls visible even when a keyboard reduces the viewport.
export function GrowingTextarea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const textarea = ref.current;
    const form = textarea?.closest('form');
    if (!textarea || !form) return;
    const children = [...form.children] as HTMLElement[];
    const fields = children.filter(child => child.classList.contains('field'));
    const occupied = children.reduce((height, child) => {
      if (fields.includes(child)) {
        const caption = child.querySelector<HTMLElement>('.field-name');
        return height + (caption ? caption.offsetHeight + parseFloat(getComputedStyle(caption).marginBottom) : 0);
      }
      return height + child.getBoundingClientRect().height;
    }, 0);
    const gaps = parseFloat(getComputedStyle(form).rowGap) * (children.length - 1);
    const limit = Math.max(1, (form.clientHeight - occupied - gaps) / fields.length);
    const border = textarea.offsetHeight - textarea.clientHeight;
    const previousScroll = textarea.scrollTop;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(limit, Math.max(132, textarea.scrollHeight + border))}px`;
    textarea.scrollTop = previousScroll;
  };

  useLayoutEffect(resize, [props.value]);
  useLayoutEffect(() => {
    const form = ref.current?.closest('form');
    if (!form) return;
    const observer = new ResizeObserver(resize);
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  return <textarea {...props} ref={ref} aria-label={label} />;
}
