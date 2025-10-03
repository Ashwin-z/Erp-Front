import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Dropdown
 * - options: [{ value, label, placeholder?: boolean }]
 * - value
 * - onChange(value)
 * - placeholder?: string
 * - small?: boolean (compact)
 * - alignRight?: boolean (menu aligns right)
 * - className?: string (width helpers)
 */
export default function Dropdown({
  options = [],
  value,
  onChange,
  placeholder,
  small = false,
  alignRight = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  // close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      } else if (e.key === "ArrowDown" || e.key === "Down") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
      } else if (e.key === "ArrowUp" || e.key === "Up") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < options.length) {
          const opt = options[activeIndex];
          onChange(opt.value);
          setOpen(false);
          btnRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, options, activeIndex, onChange]);

  useEffect(() => {
    if (!open) return;
    const el = menuRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const showText = selected ? selected.label : (placeholder || "Select…");
  const isMuted = selected?.placeholder || !selected;

  return (
    <div className={`dd ${small ? "sm" : ""} ${alignRight ? "right" : ""} ${className}`}>
      <button
        type="button"
        className="dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          const idx = options.findIndex((o) => o.value === value);
          setActiveIndex(idx >= 0 ? idx : 0);
        }}
        ref={btnRef}
      >
        <span className={`value ${isMuted ? "muted" : ""}`}>{showText}</span>
        <svg className="dd-chevron" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {open && (
        <div
          className="dd-menu"
          role="listbox"
          ref={menuRef}
          tabIndex={-1}
          aria-activedescendant={activeIndex >= 0 ? `opt-${activeIndex}` : undefined}
        >
          {options.map((opt, idx) => {
            const selectedNow = value === opt.value;
            const active = idx === activeIndex;
            return (
              <div
                id={`opt-${idx}`}
                key={opt.value + "_" + idx}
                data-idx={idx}
                role="option"
                aria-selected={selectedNow}
                className={`dd-option ${selectedNow ? "selected" : ""} ${active ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  btnRef.current?.focus();
                }}
              >
                <svg className="dd-check" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span className="dd-label">{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
