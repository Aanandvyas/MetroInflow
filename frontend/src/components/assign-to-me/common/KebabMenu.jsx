import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const KebabMenu = ({ open, anchorEl, onClose, children, width = 180 }) => {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const menuW = menuRef.current?.offsetWidth || width;
    const menuH = menuRef.current?.offsetHeight || 160;

    let left = rect.left + rect.width - menuW;
    if (left < 8) left = 8;
    if (left + menuW > vw - 8) left = vw - menuW - 8;

    let top = rect.bottom + 8;
    if (top + menuH > vh - 8) {
      // flip above if not enough space below
      top = rect.top - menuH - 8;
    }
    if (top < 8) top = Math.max(8, vh - menuH - 8);

    setPos({ top, left });
  }, [open, anchorEl, width]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const onRecalc = () => onClose?.(); // close on scroll/resize to avoid drift
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onRecalc);
    window.addEventListener("scroll", onRecalc, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onRecalc);
      window.removeEventListener("scroll", onRecalc, true);
    };
  }, [open, onClose]);

  if (!open || !anchorEl) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[999]" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-[1000] min-w-[180px] rounded-md border border-gray-200 bg-white shadow-lg py-1"
        style={{ top: pos.top, left: pos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
};

export default KebabMenu;