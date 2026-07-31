import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import "./ImageModal.css";

const ImageModal = ({
  imageSmall,
  imageMedium,
  imageLarge,
  headline,
  date,
  location,
  dateLocation,
  description,
  filename,
  keywords,
  onClose,
  onNext,
  onPrev
}) => {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Track viewport width (for breakpoints)
  const [vw, setVw] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const bp = useMemo(() => (vw <= 600 ? "mobile" : vw <= 1024 ? "tablet" : "desktop"), [vw]);
  const isTouchBreakpoint = bp !== "desktop"; // phone/tablet

  // Immersive mode (chrome hidden)
  const [isImmersive, setIsImmersive] = useState(false);

  // Dialog plumbing: this overlay is a real dialog, so it needs an accessible
  // name, focus moved into it on open, focus restored on close, and Tab kept
  // inside it while it is open.
  const titleId = useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focusable elements inside the dialog, in DOM order. getClientRects() is
  // empty for display:none, which is exactly how immersive mode hides the top
  // bar, so the trap follows the visible chrome for free. (offsetParent would
  // be wrong here: it is null for the position:fixed prev/next bar on phones.)
  const getFocusable = () => {
    const root = dialogRef.current;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.disabled && el.getClientRects().length > 0);
  };

  // Move focus into the dialog on open, and hand it back to whatever opened it
  // on close — otherwise a keyboard user is dumped at the top of the document.
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        // Back out one layer at a time: immersive first, then the modal.
        if (isImmersive) setIsImmersive(false);
        else onClose?.();
        return;
      }

      if (e.key === "Tab") {
        const focusable = getFocusable();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        const inside = dialogRef.current?.contains(active);
        if (e.shiftKey && (!inside || active === first)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (!inside || active === last)) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      // Don't steal the arrow keys from a text field someone is typing in.
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }

      if (e.key === "ArrowRight") onNext?.();
      else if (e.key === "ArrowLeft") onPrev?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isImmersive, onNext, onPrev, onClose]);

  // Image sources are already URL-encoded by App's toApi(); do NOT re-encode.
  // encodeURI() here would turn each %20 into %2520 and 404 every request.
  const small  = imageSmall;
  const medium = imageMedium;
  const large  = imageLarge;

  // ---- Swipe state (declare hooks unconditionally) ----
  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const lastXRef  = useRef(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const didSwipeRef = useRef(false);

  const SWIPE_THRESHOLD = 50;
  const MAX_VERTICAL_DRIFT = 30;

  // Handlers (gate behavior by breakpoint, but hooks above are unconditional)
  const onTouchStart = (e) => {
    if (!isTouchBreakpoint) return;
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    lastXRef.current = t.clientX;
    setIsSwiping(false);
    didSwipeRef.current = false;
  };

  const onTouchMove = (e) => {
    if (!isTouchBreakpoint) return;
    const sx = startXRef.current;
    const sy = startYRef.current;
    if (sx == null || sy == null) return;

    const t = e.touches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    lastXRef.current = t.clientX;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dy) < MAX_VERTICAL_DRIFT) {
      setIsSwiping(true);
      e.preventDefault(); // keep the gesture horizontal
    }
  };

  const onTouchEnd = () => {
    if (!isTouchBreakpoint) {
      // reset refs anyway
      startXRef.current = null;
      startYRef.current = null;
      lastXRef.current = null;
      setIsSwiping(false);
      return;
    }
    const sx = startXRef.current;
    const lx = lastXRef.current;
    if (sx == null || lx == null) {
      startXRef.current = null;
      startYRef.current = null;
      lastXRef.current = null;
      setIsSwiping(false);
      return;
    }
    const dx = lx - sx;
    if (isSwiping && Math.abs(dx) >= SWIPE_THRESHOLD) {
      didSwipeRef.current = true;
      if (dx < 0) onNext?.();
      else onPrev?.();
    }
    startXRef.current = null;
    startYRef.current = null;
    lastXRef.current = null;
    setIsSwiping(false);
  };
        const onImageClick = () => {
        if (didSwipeRef.current) { didSwipeRef.current = false; return; }
        setIsImmersive(v => {
        const next = !v;
        return next;
        });
};
  // After hooks: it’s now safe to early-return if no source
  if (!imageLarge && !imageMedium && !imageSmall) return null;
  return (


<div className="image-modal-overlay-div"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headline ? titleId : undefined}
        aria-label={headline ? undefined : "Image viewer"}>
        <div className={`image-modal-content-div 
        ${isImmersive ? "immersive" : ""}`} data-immersive={isImmersive}  >
                {/* Top bar (fades out via CSS when immersive) */}
                <div className="image-modal-nav-and-text-div" aria-hidden={isImmersive}  >
                        <div className="image-modal-nav-div"  >
                                <div className="image-modal-close-div"  >
                                        <button className="image-modal-nav-button"
                                        ref={closeButtonRef}
                                        onClick={onClose} aria-label="Close">
                                                <i className="button-icon bi bi-x-lg"></i>
                                        </button>
                                </div>
                                <div className="image-modal-back-and-forward-div"  >
                                        <button className="image-modal-nav-button"   
                                        onClick={onPrev} aria-label="Previous">
                                                <i className="button-icon left-icon bi bi-chevron-left accordion-button-icon" aria-hidden="true" />
                                        </button>
                                        <button className="image-modal-nav-button"  
                                        onClick={onNext} aria-label="Next">
                                                <i className="button-icon right-icon bi bi-chevron-right accordion-button-icon" aria-hidden="true" />
                                        </button>
                                </div>
                        </div>
                        <div className="image-modal-text-div" /* CV (skip indiv texts) */ >
                                <h3 className="image-modal-headline" id={titleId}>{headline}</h3>
                                {dateLocation ? (
                                <p className="image-modal-date-location">{dateLocation}</p>
                                ) : (
                                <>
                                <p className="image-modal-date">{date}</p>
                                <p className="image-modal-location">{location}</p>
                                </>
                                )}
                                <p className="image-modal-description">{description}</p>
                                <p className="image-modal-filename">{filename}</p>
                                <p className="image-modal-keywords">{keywords}</p>
                        </div>
                </div>
                <button type="button" className="image-modal-image-container-div"
                aria-label={isImmersive ? "Exit full screen" : "View full screen"}
                aria-pressed={isImmersive}
                onClick={onImageClick} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                        <picture key={bp}>
                                <source media="(max-width: 600px)" srcSet={small} />
                                <source media="(max-width: 1024px)" srcSet={medium} />
                                <img
                                src={large}
                                alt={headline || ""}
                                onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/images/Image Not Available.png";
                                }} />
                        </picture>
                </button>
        </div>
</div>









);
};
export default ImageModal;