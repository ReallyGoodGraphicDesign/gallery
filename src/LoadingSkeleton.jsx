import "./Card.css"; // shares .card / .card-image-container / .card-text-container
import "./LoadingSkeleton.css";

// Placeholder for the category chooser while /api/data is in flight.
//
// The tiles are built out of Card's own classes rather than a second set of
// measurements, so the grid drawn here and the grid that replaces it are the
// same geometry at every breakpoint — nothing moves when `loading` flips. It
// also means this component only has to describe what's DIFFERENT about a
// placeholder tile (flat blocks, no image, no text); the column count, gaps,
// padding and 1:1 image box all still come from App.css and Card.css.
const TILES = 12; // three rows of the 4-column desktop layout

export default function LoadingSkeleton() {
  return (
    // role="status" already implies aria-live="polite", so that doesn't need
    // spelling out. The text does: the blocks below are decorative and hidden,
    // and without it this region would announce nothing at all for the whole
    // fetch.
    <div className="loading-skeleton" role="status" aria-busy="true">
      <span className="skeleton-status">Loading gallery…</span>
      <div className="card-grid" aria-hidden="true">
        {Array.from({ length: TILES }).map((_, i) => (
          // --i staggers the sweep across the grid, wrapping every sixth tile
          // so the last one isn't held back by most of a second. It's set on
          // the tile and inherited by the three blocks inside, so each tile
          // shimmers as one piece rather than in three separate passes.
          <div
            className="card skeleton-card"
            key={i}
            style={{ "--i": String(i % 6) }}
          >
            <div className="card-image-container skeleton-block" />
            <div className="card-text-container">
              <div className="skeleton-line skeleton-headline skeleton-block" />
              <div className="skeleton-line skeleton-meta skeleton-block" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
