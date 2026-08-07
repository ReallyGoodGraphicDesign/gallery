import "./Card.css";
// `eager` opts a card out of lazy loading. The image grid can run to hundreds
// of rows, so lazy is right for the bulk of it — but it's wrong for the cards
// already on screen at first paint, which have to wait for layout before the
// browser will start their fetch. App.jsx sets it for the opening screenful.
const Card = ({
        imageTiny, headline, dateLocation, date, location, description, filename, keywords, onImageClick, eager = false }) => {
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
                                <img  loading={eager ? "eager" : "lazy"}
                                fetchpriority={eager ? "high" : undefined}
                                src={imageTiny} alt={headline || ""} onError={(e) => {
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