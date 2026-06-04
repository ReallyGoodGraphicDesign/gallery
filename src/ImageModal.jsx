import React, { useEffect, useMemo, useRef, useState } from "react";
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
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && isImmersive) setIsImmersive(false);
      else if (e.key === "ArrowRight") onNext?.();
      else if (e.key === "ArrowLeft") onPrev?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isImmersive, onNext, onPrev]);

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


<div className="image-modal-overlay-div"  > 
        <div className={`image-modal-content-div 
        ${isImmersive ? "immersive" : ""}`} data-immersive={isImmersive}  >
                {/* Top bar (fades out via CSS when immersive) */}
                <div className="image-modal-nav-and-text-div" aria-hidden={isImmersive}  >
                        <div className="image-modal-nav-div"  >
                                <div className="image-modal-close-div"  >
                                        <button className="image-modal-nav-button" 
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
                                <h3 className="image-modal-headline">{headline}</h3>
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
                <div className="image-modal-image-container-div"  
                onClick={onImageClick} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                        <picture key={bp}>
                                <source media="(max-width: 600px)" srcSet={small} />
                                <source media="(max-width: 1024px)" srcSet={medium} />
                                <img
                                src={large}
                                alt={headline}
                                onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/images/Image Not Available.png";
                                }} />
                        </picture>
                </div>
        </div>
</div>









);
};
export default ImageModal;