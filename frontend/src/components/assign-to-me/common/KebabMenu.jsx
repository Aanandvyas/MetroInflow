import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const KebabMenu = ({
  open,
  anchorEl,
  onClose,
  width = 160,
  offset = 6,
  children,
}) => {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  const calcPos = () => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const left = clamp(rect.right - width, 8, window.innerWidth - width - 8);
    const top = clamp(rect.bottom + offset, 8, window.innerHeight - 8);
    setPos({ top, left });
  };

  // Recalculate immediately when opened
  useLayoutEffect(() => {
    if (open) calcPos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorEl]);

  // Follow scroll/resize anywhere in the page
  useEffect(() => {
    if (!open) return;
    const onScroll = () => calcPos();
    const onResize = () => calcPos();
    // capture: true lets us catch scrolls from any scrollable ancestor
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, anchorEl]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      const insideMenu = menuRef.current && menuRef.current.contains(e.target);
      const insideAnchor = anchorEl && anchorEl.contains(e.target);
      if (!insideMenu && !insideAnchor) onClose?.();
    };
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorEl, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[1000] w-40 rounded-md border border-gray-200 bg-white shadow-lg py-1"
      style={{ top: pos.top, left: pos.left, width }}
    >
      {children}
    </div>,
    document.body
  );
};

export default KebabMenu;