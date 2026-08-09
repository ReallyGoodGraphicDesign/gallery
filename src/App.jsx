import "./App.css";
import Header from "./Header.jsx";
// import ResumeText from "./ResumeText"; 
import Card from "./Card.jsx";
import CategoryCard from "./CategoryCard.jsx";
import ImageModal from "./ImageModal.jsx";
import LoadingSkeleton from "./LoadingSkeleton.jsx";
import { buildCategoryCards, splitCategories } from "./sheet.js";
import { useEffect, useMemo, useState } from "react";

// How many image-grid cards load eagerly instead of lazily. See the `eager`
// prop in Card.jsx for why the first ones shouldn't wait.
const EAGER_CARDS = 8;

 const BANNERS = [ // ORDER MATTERS HERE
   "logo-01",
   "logo-03",
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
// Passcodes live in the GALLERY_PASSCODES secret, never in this bundle. Each
// passcode maps to one access label, which decides the images this session can
// see; the label travels in a signed HttpOnly cookie the client cannot read.

function App() {
  // 1. auth hooks
  const [authed, setAuthed] = useState(false);
  const [input, setInput] = useState("");

     const [banner] = useState(BANNERS[0]);
  
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

  // 2. app hooks
  const [cardData, setCardData] = useState([]);
  const [filteredCardData, setFilteredCardData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(""); // "" = All
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  // Which screen we're on. Kept separate from selectedCategory because that
  // already uses "" to mean "every image" — it can't also mean "choosing".
  const [view, setView] = useState("categories"); // "categories" | "images"

  // fetch data — only after login, since /api/data requires a valid session.
  // The Google Apps Script URL now lives server-side in the SHEET_URL secret.
  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    // Forwarding ?fresh=1 from the page URL makes one load bypass the sheet
    // cache, so an edit shows up now instead of waiting out SHEET_CACHE_TTL.
    // That cache lives between the Worker and Apps Script (see _sheet.js), so
    // no amount of hard-refreshing gets past it from the browser side — this
    // param is the only way to ask for a fresh read. Images still resolve
    // against the cached sheet, so a brand-new one can 404 briefly.
    const fresh = new URLSearchParams(window.location.search).has("fresh");
    fetch(fresh ? "/api/data?fresh=1" : "/api/data", {
      credentials: "same-origin",
      // The fresh response already carries no-store; asking here too means the
      // browser can't answer this one from its own cache either.
      cache: fresh ? "no-store" : "default",
    })
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

  const categoryCards = useMemo(() => buildCategoryCards(cardData), [cardData]);

  // Typing a search term should show results, not leave you staring at the
  // chooser wondering why nothing happened.
  const showingImages = view === "images" || searchTerm.trim() !== "";

  const openCategory = (name) => {
    setSelectedCategory(name);
    setView("images");
    // Opening a category is a new screen, not a continuation of the chooser, so
    // it starts at the top rather than wherever the tile happened to be. The
    // scroll is instant on purpose: the grid underneath is being replaced at the
    // same moment, so animating past content that's about to vanish just reads
    // as a glitch. Safe to call before the re-render — 0 is a valid offset at
    // any document height, so nothing clamps it back.
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const backToCategories = () => {
    setSelectedCategory("");
    setSearchTerm("");
    setView("categories");
  };

  // combined filter: category (single-select) AND search term
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
    const cat = selectedCategory.toLowerCase();

    const matchesCategory = (card) =>
      cat === "" ||
      splitCategories(card.category).some((n) => n.toLowerCase() === cat);

    const matchesSearch = (card) =>
      term === "" ||
      ["headline", "filename", "description", "keywords"].some((field) =>
        toText(card[field], field, card).includes(term)
      );

    setFilteredCardData(
      cardData.filter((card) => matchesCategory(card) && matchesSearch(card))
    );
  }, [searchTerm, selectedCategory, cardData]);

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
      } else if (res.status === 401) {
        alert("Wrong password.");
      } else if (res.status >= 500) {
        // /api/login answers 500 "Server not configured" when GALLERY_PASSCODES
        // or SESSION_SECRET is missing from the deployment, or when the passcode
        // map isn't parseable JSON — it bails before comparing anything, so no
        // passcode can work. Reporting that as "Wrong password." sends people
        // hunting for a typo when the real fix is a secret + redeploy.
        alert(
          "The gallery isn't configured correctly right now, so no passcode will " +
            "work. This is a problem on our end — please try again later."
        );
      } else {
        alert(`Couldn't sign in (error ${res.status}). Please try again.`);
      }
    } catch {
      alert("Couldn't reach the server. Check your connection and try again.");
    }
  };

  // Ending a session is two halves that have to happen together: the server
  // clears the signed cookie, and every piece of state that session produced is
  // dropped here. Skipping the second half would leave the passcode sitting in
  // the splash input and the previous label's cards in memory — so this resets
  // each auth/app hook back to the value it was declared with.
  const handleLogout = async () => {
    // A failed POST still shouldn't strand you in a session you asked to leave:
    // the cookie survives, but the next /api/session check on reload settles it.
    try {
      await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // offline — fall through to the local reset
    }
    setAuthed(false);
    setInput("");
    setCardData([]);
    setFilteredCardData([]);
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedIndex(null);
    setView("categories");
    setLoading(true);
  };

  // 3. now that all hooks are declared, you can branch in the render
  if (!authed) {
    return (
      <div className="splash">
         <div className="logo-carousel-wrapper">
                <div className="logo-carousel-image" />
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
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onLogout={handleLogout}
      />
      <main>
        {loading ? (
          <LoadingSkeleton />
        ) : !showingImages ? (
          <div className="card-grid">
            {categoryCards.map((c) => (
              <CategoryCard
                key={c.name}
                name={c.name}
                count={c.count}
                imageTiny={c.imageTiny}
                onSelect={() => openCategory(c.name)}
              />
            ))}
          </div>
        ) : filteredCardData.length > 0 ? (
          <>
          <div className="category-bar">
            {/* Same classes as the header's menu button, so size, colour, hover
                and active all come from the same rules rather than a copy that
                can drift. The glyph is a chevron rather than that button's X:
                this goes up a level to the chooser, it doesn't dismiss an
                overlay. The label the text used to carry moves to aria-label.
                First in the DOM, not just visually first, so reading order and
                tab order match what's on screen. */}
            <button type="button" className="button menu-toggle-button category-back-button"
              onClick={backToCategories} aria-label="Back" title="Back">
              <i className="bi bi-chevron-left"></i>
            </button>
            <p className="category-current">
              {/* Without the All tile, "no category" is only reachable by
                  searching from the chooser — so label it as a search. */}
              {selectedCategory || (searchTerm.trim() ? "Search results" : "All images")}
              {/* The gap around the bullet is CSS, not literal spaces: HTML
                  collapses a run of spaces to one, so it can't be widened here. */}
              <span className="category-current-sep">·</span>
              {filteredCardData.length} {filteredCardData.length === 1 ? "image" : "images"}
            </p>
          </div>
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
                // Roughly the opening screenful: two rows at the 4-column
                // desktop layout, four at the 2-column phone one. Past that
                // lazy loading is doing real work and should stay.
                eager={idx < EAGER_CARDS}
                onImageClick={() => setSelectedIndex(idx)}
              />
            ))}
          </div>
          </>
        ) : (
          <div className="no-results">
            {/* Same classes as the header's menu button, so size, colour, hover
                and active all come from the same rules rather than a copy that
                can drift. The glyph is a chevron rather than that button's X:
                this goes up a level to the chooser, it doesn't dismiss an
                overlay. The label the text used to carry moves to aria-label. */}
            <button type="button" className="button menu-toggle-button category-back-button"
              onClick={backToCategories} aria-label="Back" title="Back">
              <i className="bi bi-chevron-left"></i>
            </button>
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