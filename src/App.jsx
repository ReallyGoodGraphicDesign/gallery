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

// Auth is now handled server-side by Pages Functions (/api/login, /api/session).
// The password lives in the GALLERY_PASSWORD secret, never in this bundle.

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
  
  // 👇 ask the server once, on mount, whether we already have a valid session
  useEffect(() => {
    fetch("/api/session", { credentials: "same-origin" })
      .then((res) => {
        if (res.ok) setAuthed(true);
      })
      .catch(() => {});
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

  // fetch data — only after login, since /api/data requires a valid session.
  // The Google Apps Script URL now lives server-side in the SHEET_URL secret.
  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    fetch("/api/data", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => {
        // Turn a Google Sheet image path into an authenticated API URL.
        // The sheet stores ".../images/large/Foo.jpg"; we want
        // "/api/image/large/Foo.webp", which the gated Function serves from R2.
        const toApi = (v) => {
          if (typeof v !== "string" || !v) return v;
          const webp = v.replace(/\.jpe?g$/i, ".webp");
          const marker = "images/";
          const i = webp.indexOf(marker);
          const key = i >= 0 ? webp.slice(i + marker.length) : webp.replace(/^\/+/, "");
          // encode each segment (handles spaces in filenames), keep the slashes
          const encoded = key.split("/").map(encodeURIComponent).join("/");
          return `/api/image/${encoded}`;
        };

        const patched = data.map((card) => ({
          ...card,
          imageTiny: toApi(card.imageTiny),
          imageSmall: toApi(card.imageSmall),
          imageMedium: toApi(card.imageMedium),
          imageLarge: toApi(card.imageLarge),
        }));

        setCardData(patched);
        setFilteredCardData(patched);
      })
      .catch((err) => console.error("Error loading data:", err))
      .finally(() => setLoading(false));
  }, [authed]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: input }),
      });
      if (res.ok) {
        setAuthed(true);
      } else {
        alert("No");
      }
    } catch {
      alert("Something went wrong. Try again.");
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