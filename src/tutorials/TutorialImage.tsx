import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TutorialScreenshot } from './content';

function ImageViewer({ image, onClose }: { image: TutorialScreenshot; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return createPortal(
    <dialog
      ref={dialog}
      className="tutorial-image-dialog"
      aria-label="教程截图"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="tutorial-image-toolbar">
        <span>教程截图</span>
        <button aria-pressed={zoomed} onClick={() => setZoomed((current) => !current)}>
          {zoomed ? '适应窗口' : '查看原尺寸'}
        </button>
        <button autoFocus onClick={onClose}>
          关闭图片
        </button>
      </header>
      <div className="tutorial-image-viewport" data-zoomed={zoomed || undefined}>
        <img src={image.src} alt={image.alt} width={image.width} height={image.height} />
      </div>
    </dialog>,
    document.body,
  );
}

export function TutorialImage({ image }: { image: TutorialScreenshot }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="tutorial-image-button"
        onClick={() => setOpen(true)}
        aria-label={`放大查看：${image.alt}`}
      >
        <img
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
        />
        <span>点击放大 ↗</span>
      </button>
      {open && <ImageViewer image={image} onClose={() => setOpen(false)} />}
    </>
  );
}
