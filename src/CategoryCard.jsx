import "./Card.css"; // shares .card / .card-image-container / .card-text-container
import "./CategoryCard.css";

// A category tile for the chooser grid. Deliberately reuses Card's class names
// so it reads as the same grid the gallery already uses.
//
// Unlike Card, the WHOLE tile is the button: the category name is the label, so
// a tile whose text wasn't clickable would be odd, and there is little enough
// text here that the accessible name stays short ("Alaska, 43 images").
const CategoryCard = ({ name, count, imageTiny, onSelect }) => (
  <button type="button" className="card category-card" onClick={onSelect}>
    <div className="card-image-container">
      {/* alt="" on purpose: the tile's accessible name comes from the text
          below, so naming the image too would just repeat it. */}
      <img
        loading="lazy"
        src={imageTiny}
        alt=""
        onError={(e) => {
          e.target.onerror = null; // prevent infinite loop
          e.target.src = "/images/Image Not Available.png";
        }}
      />
    </div>
    <div className="card-text-container">
      <h3 className="card-headline">{name}</h3>
      <p className="card-date category-card-count">
        {count} {count === 1 ? "image" : "images"}
      </p>
    </div>
  </button>
);

export default CategoryCard;
