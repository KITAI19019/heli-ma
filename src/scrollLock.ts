const owners = new Set<symbol>();
let previousOverflow = '';

export function lockBodyScroll() {
  const owner = Symbol('scroll-lock');
  if (owners.size === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  owners.add(owner);
  return () => {
    if (owners.delete(owner) && owners.size === 0) document.body.style.overflow = previousOverflow;
  };
}
