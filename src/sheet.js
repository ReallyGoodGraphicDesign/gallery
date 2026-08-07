// Parsing for the Google Sheet's list-shaped cells, and the category chooser
// built out of them.
//
// This lives outside App.jsx because none of it touches React: it's a pure
// function of the rows the sheet handed back. Keeping it here means the rules
// below — which slot claims what, and what an empty cell means — can be tested
// directly, and they need it: the failure mode for most of them is a tile that
// quietly sorts to the wrong place or picks the wrong cover, which nothing
// about the rendered page would make obvious.

// Split a `category` cell into trimmed, non-empty names (comma-separated).
export const splitCategories = (v) =>
  typeof v === "string"
    ? v.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

// Does one `cover` value mark its row as a cover image? Kept loose on purpose
// so the sheet can use x / TRUE / 1 interchangeably.
export const isCoverFlag = (v) => {
  if (v === true) return true;
  if (typeof v === "number") return v !== 0;
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s !== "" && s !== "false" && s !== "0" && s !== "no";
};

// `cover` splits like `cat_order` does, so slot i marks the row as cover for
// category i: "Graphic Design, Digest" against ", x" makes the row Digest's
// cover while leaving Graphic Design's alone. A best-of category shares
// nearly all its rows with the categories it draws from, so a single
// row-level flag could never have separated the two.
//
// Only a comma turns the cell into a list. Anything else — "x", TRUE, 1, a
// checkbox — stays one value that broadcasts to every category on the row,
// which is what every existing flag in the sheet relies on.
export const splitCoverFlags = (v) =>
  typeof v === "string" && v.includes(",")
    ? v.split(",").map(isCoverFlag)
    : [isCoverFlag(v)];

// Whether the row claims cover for its i-th category. Mirrors catOrderAt: one
// value broadcasts, past that it's positional, and a list that ran short
// simply doesn't claim the categories it didn't reach.
export const coverAt = (flags, i) =>
  flags.length === 1 ? flags[0] : i < flags.length ? flags[i] : false;

// Parse a `cat_order` cell into a sort number, or null when there isn't one.
// Note Number("") is 0, which would sort an empty cell to the FRONT — hence
// the explicit empty check rather than a bare Number() call.
export const toCatOrder = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// Split a `cat_order` cell the same way `category` is split, so slot i of one
// lines up with slot i of the other: "Graphic Design, Greatest Hits" against
// "20, 1" ranks the row 20th among Graphic Design's rows and 1st among
// Greatest Hits'. That's the whole point of the list form — one number per row
// can only be broadcast to every category on it, so a number low enough to
// lift one category always dragged its co-categories along.
//
// Empty and unparseable slots become null rather than collapsing away, so
// ", 1" keeps the 1 in slot 2 instead of sliding it into slot 1.
export const splitCatOrders = (v) =>
  v == null || String(v).trim() === ""
    ? []
    : String(v).split(",").map(toCatOrder);

// The order a row claims in its i-th category. A single bare number still
// applies to every category on the row — that's the pre-list behaviour, so a
// sheet that never adopts the list form keeps sorting exactly as it did.
// Past that it's strictly positional, and a row whose list ran short is
// simply unnumbered in the categories it didn't reach.
export const catOrderAt = (orders, i) =>
  orders.length === 1 ? orders[0] : i < orders.length ? orders[i] : null;

// The category chooser's tiles: one per distinct category among the loaded
// cards, deduped case-insensitively (first-seen casing wins) and sorted A–Z.
// Because cardData is already access-scoped, the chooser auto-scopes too.
export function buildCategoryCards(cardData) {
  const groups = new Map(); // lowercased name -> { name, cards, covers, orders }
  for (const card of cardData) {
    // Read the row's lists once, then hand each category the slot that
    // belongs to it. Both claims have to be resolved HERE, while we still
    // know which slot this card occupied — by the time the groups are mapped
    // below, that position is gone.
    const claimed = splitCatOrders(card.cat_order);
    const flagged = splitCoverFlags(card.cover);
    splitCategories(card.category).forEach((name, i) => {
      const key = name.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, { name, cards: [], covers: [], orders: [] });
      }
      const group = groups.get(key);
      group.cards.push(card);
      if (coverAt(flagged, i)) group.covers.push(card);
      const n = catOrderAt(claimed, i);
      if (n !== null) group.orders.push(n);
    });
  }
  return [...groups.values()]
    .map(({ name, cards, covers, orders }) => {
      // Prefer a row that claimed cover FOR THIS category, earliest in sheet
      // order if several did, and only among rows THIS passcode can see — a
      // cover flagged on a row they lack access to would 404 through the
      // image route. Falling back to the first visible image means every
      // tile always renders something real.
      const cover = covers[0] || cards[0];

      // Sheet-driven tile order, from the numbers the rows claimed for THIS
      // category specifically. Still the MINIMUM, and still only across the
      // rows this passcode can see: a single numbered row is enough, but
      // filling the number down a category's whole block keeps its position
      // even for a passcode that can't see the numbered row (as with
      // California's admin-only cover). Nothing numbered anywhere ->
      // Infinity, i.e. sorts last.
      const order = orders.length ? Math.min(...orders) : Number.POSITIVE_INFINITY;

      return { name, count: cards.length, imageTiny: cover?.imageTiny, order };
    })
    // Numbered tiles first in ascending order; everything unnumbered falls to
    // the bottom and stays alphabetical among itself. So numbering only your
    // top few categories works, and gaps (10, 20, 30) leave room to insert.
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}
