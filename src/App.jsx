import "./App.css";
import "./LoadingSkeleton.css";
import Header from "./Header.jsx";
// import ResumeText from "./ResumeText"; 
import Card from "./Card.jsx";
import ImageModal from "./ImageModal.jsx";
import LoadingSkeleton from "./LoadingSkeleton.jsx";
import { useEffect, useState } from "react";

 const BANNERS = [ // ORDER MATTERS HERE
   "logo-03",
   "logo-01",
   "logo-02",
   "logo-04",
   "logo-05",
   "logo-06",
   "logo-07",
   "logo-08",
   "logo-09",
   "logo-10",
   "logo-11",
   "logo-12",
   "logo-13",
   "logo-14",
   "logo-15",
   "logo-18"
];

const funtime = "Ok";
const AUTH_KEY = "gallery-authed"; // name in localStorage

function App() {
  // 1. auth hooks
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");

     const [banner, setBanner] = useState(() => {
     const saved =
       typeof window !== "undefined" &&
       window.localStorage &&
       window.localStorage.getItem("theme-banner");

     const attr =
       typeof document !== "undefined" &&
       document.documentElement.getAttribute("data-theme-banner");
     return saved || attr || BANNERS[0];
   });
  
  // 👇 check localStorage once, when the app mounts
  useEffect(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    if (saved === "true") {
      setAuthed(true);
    }
  }, []);

   useEffect(() => {
     if (typeof document !== "undefined") {
       document.documentElement.setAttribute("data-theme-banner", banner);
     }
     if (typeof window !== "undefined" && window.localStorage) {
       window.localStorage.setItem("theme-banner", banner);
     }
   }, [banner]);

   const advanceBanner = () => {
     const idx = BANNERS.indexOf(banner);
     const next = BANNERS[(idx + 1) % BANNERS.length];
     setBanner(next);
   };

  // 2. app hooks
  const [cardData, setCardData] = useState([]);
  const [filteredCardData, setFilteredCardData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  // fetch data
  useEffect(() => {
    setLoading(true);
    fetch(
      "https://script.google.com/macros/s/AKfycbz7AC7ptwQ91zSTO9xYisad8JmB5YmtB3jDq_ZZatYxZHtbuJPlvlswu-JUXcJgKiBJ1g/exec"
    )
      .then((res) => res.json())
      .then((data) => {
        const BASE = window.location.pathname.startsWith("/gallery")
          ? "/gallery"
          : "";

        const fix = (v) => {
          if (!v) return v;
          if (typeof v === "string" && v.startsWith(`${BASE}/`)) return v;
          if (typeof v === "string" && v.startsWith("/")) return `${BASE}${v}`;
          return `${BASE}/${v.replace(/^\.?\/*/, "")}`;
        };

        // Serve WebP versions of the gallery images. The Google Sheet still
        // stores .jpg paths; we rewrite the extension for the four image fields
        // only (the `filename` display field is left untouched).
        const toWebp = (v) =>
          typeof v === "string" ? v.replace(/\.jpe?g$/i, ".webp") : v;

        const patched = data.map((card) => ({
          ...card,
          imageTiny: fix(toWebp(card.imageTiny)),
          imageSmall: fix(toWebp(card.imageSmall)),
          imageMedium: fix(toWebp(card.imageMedium)),
          imageLarge: fix(toWebp(card.imageLarge)),
        }));

        setCardData(patched);
        setFilteredCardData(patched);
      })
      .catch((err) => console.error("Error loading data:", err))
      .finally(() => setLoading(false));
  }, []);

  // search filter
  useEffect(() => {
    const toText = (v, fieldName, card) => {
      if (v == null) return "";
      if (typeof v !== "string") {
        console.warn(
          `Non-string value in field "${fieldName}" for card:`,
          card,
          "Value:",
          v
        );
        return String(v);
      }
      return v.toLowerCase();
    };

    const term = searchTerm.toLowerCase();

    if (searchTerm === "") {
      setFilteredCardData(cardData);
    } else {
      const results = cardData.filter((card) =>
        ["headline", "filename", "description", "keywords"].some((field) =>
          toText(card[field], field, card).includes(term)
        )
      );
      setFilteredCardData(results);
    }
  }, [searchTerm, cardData]);

  const asText = (v) => {
    if (v == null) return "";
    if (typeof v === "string") return v.trim();
    if (v instanceof Date) return v.toLocaleDateString();
    return String(v).trim();
  };

  const formatDateLocation = (date, location) => {
    const d = asText(date);
    const l = asText(location);
    return d && l ? `${d} • ${l}` : d || l;
  };

  cardData.forEach((c, i) => {
    if (c.date != null && typeof c.date !== "string")
      console.warn("Non-string date at row", i, c.date);
    if (c.location != null && typeof c.location !== "string")
      console.warn("Non-string location at row", i, c.location);
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === funtime) {
      setAuthed(true);
      localStorage.setItem(AUTH_KEY, "true");
    } else {
      alert("No");
    }
  };

  // 3. now that all hooks are declared, you can branch in the render
  if (!authed) {
    return (
      <div className="splash">
         <div className="logo-carousel-wrapper">
                <button className="logo-carousel-image logo-carousel-button"
                type="button"
                onClick={advanceBanner}
                aria-label="Next" 
                title="Tap to change banner" />
         </div>
         <div className="funtime-all"> 
        <h3>Password</h3>
        <form className="input-and-button"
        onSubmit={handleSubmit}>
          <input className="funtime-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder=""
          />
          {input.length > 0 && (
          <button className="button funtime-button" type="submit">
                <span>Enter</span>
        </button> )}
        </form>
        </div>        
      </div>
    );
  }

  return (
    <div className="App">
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <main>
        {loading ? (
          <LoadingSkeleton />
        ) : filteredCardData.length > 0 ? (
          <div className="card-grid">
            {filteredCardData.map((card, idx) => (
              <Card
                key={idx}
                imageTiny={card.imageTiny}
                headline={card.headline}
                dateLocation={formatDateLocation(card.date, card.location)}
                date={card.date}
                location={card.location}
                description={card.description}
                filename={card.filename}
                keywords={card.keywords}
                onImageClick={() => setSelectedIndex(idx)}
              />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No results found for your search term</p>
          </div>
        )}
      </main>
      {selectedIndex !== null && (
        <ImageModal
          imageSmall={filteredCardData[selectedIndex].imageSmall}
          imageMedium={filteredCardData[selectedIndex].imageMedium}
          imageLarge={filteredCardData[selectedIndex].imageLarge}
          headline={filteredCardData[selectedIndex].headline}
          dateLocation={formatDateLocation(
            filteredCardData[selectedIndex].date,
            filteredCardData[selectedIndex].location
          )}
          date={filteredCardData[selectedIndex].date}
          location={filteredCardData[selectedIndex].location}
          description={filteredCardData[selectedIndex].description}
          filename={filteredCardData[selectedIndex].filename}
          keywords={filteredCardData[selectedIndex].keywords}
          onClose={() => setSelectedIndex(null)}
          onNext={() =>
            setSelectedIndex(
              (prev) => (prev + 1) % filteredCardData.length
            )
          }
          onPrev={() =>
            setSelectedIndex(
              (prev) => (prev - 1 + filteredCardData.length) %
                filteredCardData.length
            )
          }
        />
      )}
    </div>
  );
}

export default App;