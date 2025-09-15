import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

const KebabMenu = ({ open, anchorEl, onClose, children, width = 180 }) => {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  
  // Set position when menu opens
  useLayoutEffect(() => {
    if (!open || !anchorEl || !menuRef.current) return;
    
    const rect = anchorEl.getBoundingClientRect();
    let left = rect.right - width;
    if (left < 10) left = 10;
    
    const top = rect.bottom + 5;
    
    setPos({ top, left });
  }, [open, anchorEl, width]);

  // CRITICAL FIX: Use a more direct approach to detect scrolling
  useEffect(() => {
    if (!open || !onClose) return;
    
    console.log("KebabMenu opened, adding scroll listeners");
    
    // Function that will be called on scroll
    const handleScroll = () => {
      console.log("Scroll detected, closing menu");
      onClose();
    };
    
    // Attach to multiple elements to ensure we catch all scrolls
    window.addEventListener('scroll', handleScroll, { capture: true });
    document.addEventListener('scroll', handleScroll, { capture: true });
    
    // Also close on wheel events which happen before scroll
    window.addEventListener('wheel', handleScroll, { capture: true });
    document.addEventListener('wheel', handleScroll, { capture: true });
    
    // Also listen for touchmove which is often used for scrolling on mobile
    window.addEventListener('touchmove', handleScroll, { capture: true });
    document.addEventListener('touchmove', handleScroll, { capture: true });
    
    return () => {
      console.log("Removing scroll listeners");
      window.removeEventListener('scroll', handleScroll, { capture: true });
      document.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('wheel', handleScroll, { capture: true });
      document.removeEventListener('wheel', handleScroll, { capture: true });
      window.removeEventListener('touchmove', handleScroll, { capture: true });
      document.removeEventListener('touchmove', handleScroll, { capture: true });
    };
  }, [open, onClose]);

  // Close on escape key
  useEffect(() => {
    if (!open || !onClose) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !anchorEl) return null;

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[999]" 
        onClick={onClose} 
      />
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-[1000] bg-white shadow-lg border border-gray-200 rounded-md py-1"
        style={{ 
          top: `${pos.top}px`, 
          left: `${pos.left}px`, 
          width: `${width}px`,
          maxHeight: '300px',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
};

const AssignToMe = ({ file }) => {
  const [openMenuId, setOpenMenuId] = useState(null);

  return (
    <div>
      {/* Your button with the ellipsis icon */}
      <button
        id={`kebab-btn-${file.f_uuid}`}
        onClick={() => setOpenMenuId(openMenuId === file.f_uuid ? null : file.f_uuid)}
        className="p-2 rounded-md hover:bg-gray-100"
      >
        <EllipsisVerticalIcon className="w-5 h-5" />
      </button>

      {/* The menu component */}
      <KebabMenu
        open={openMenuId === file.f_uuid}
        anchorEl={document.getElementById(`kebab-btn-${file.f_uuid}`)}
        onClose={() => setOpenMenuId(null)}
      >
        {/* Menu items */}
      </KebabMenu>
    </div>
  );
};

export default KebabMenu;
export { AssignToMe };