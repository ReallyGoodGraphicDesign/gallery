import "./Card.css";
const Card = ({
        imageTiny, headline, dateLocation, date, location, description, filename, keywords, onImageClick }) => {
return (
        <div className="card">
                <div className="card-image-container">
                        <img  loading="lazy" src={imageTiny} alt={headline} onError={(e) => {
                        e.target.onerror = null; // prevent infinite loop
                        e.target.src = "/images/Image Not Available.png";
                        }}
                        onClick={onImageClick} />
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