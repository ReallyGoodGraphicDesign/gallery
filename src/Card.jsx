import "./Card.css";
const Card = ({
        imageTiny, headline, dateLocation, date, location, description, filename, keywords, onImageClick }) => {
return (
        <div className="card">
                <div className="card-image-container">
                        {/* A real <button> so the modal is reachable by keyboard, not just
                            by mouse. Scoped to the image rather than the whole card: the
                            card's text fields would otherwise collapse into one long
                            accessible name. Falls back to a generic label when a row has
                            no headline, since the alt text would then be empty. */}
                        <button type="button" className="card-image-button"
                        aria-label={headline ? undefined : "Open image"}
                        onClick={onImageClick}>
                                <img  loading="lazy" src={imageTiny} alt={headline || ""} onError={(e) => {
                                e.target.onerror = null; // prevent infinite loop
                                e.target.src = "/images/Image Not Available.png";
                                }} />
                        </button>
                </div>
                <div className="card-text-container">
                        <h3 className="card-headline">{headline || ''}</h3>
                        <p className="card-date-location">{dateLocation}</p>
                        <p className="card-date">{date || ""}</p>
                        <p className="card-location">{location || ""}</p>
                        <p className="card-description">{description || ''}</p>
                        <p className="card-filename">{filename || ''}</p>
                        <p className="card-keywords">{keywords || ''}</p>
                </div>
        </div>
);
}

export default Card;