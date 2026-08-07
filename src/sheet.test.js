import { describe, expect, test } from "vitest";
import {
  buildCategoryCards,
  catOrderAt,
  coverAt,
  isCoverFlag,
  splitCatOrders,
  splitCategories,
  splitCoverFlags,
  toCatOrder,
} from "./sheet.js";

// A row as the sheet hands it over. Only the fields the chooser reads matter.
const row = (fields) => ({ imageTiny: "/api/image/tiny/x.webp", ...fields });

describe("splitCategories", () => {
  test("splits on commas and trims", () => {
    expect(splitCategories("Graphic Design, Digest")).toEqual([
      "Graphic Design",
      "Digest",
    ]);
  });

  test("drops empty slots so a stray comma can't invent a category", () => {
    expect(splitCategories("Alaska, ,Utah,")).toEqual(["Alaska", "Utah"]);
  });

  test("a non-string cell has no categories", () => {
    expect(splitCategories(undefined)).toEqual([]);
    expect(splitCategories(null)).toEqual([]);
    expect(splitCategories(42)).toEqual([]);
  });
});

describe("isCoverFlag", () => {
  test("accepts the forms the sheet actually uses", () => {
    // A checkbox column comes back boolean, a hand-typed one as text.
    expect(isCoverFlag(true)).toBe(true);
    expect(isCoverFlag("x")).toBe(true);
    expect(isCoverFlag("X")).toBe(true);
    expect(isCoverFlag("TRUE")).toBe(true);
    expect(isCoverFlag("1")).toBe(true);
    expect(isCoverFlag(1)).toBe(true);
  });

  test("treats the explicit negatives as unset, whatever their casing", () => {
    expect(isCoverFlag(false)).toBe(false);
    expect(isCoverFlag("false")).toBe(false);
    expect(isCoverFlag("FALSE")).toBe(false);
    expect(isCoverFlag("0")).toBe(false);
    expect(isCoverFlag("no")).toBe(false);
    expect(isCoverFlag(0)).toBe(false);
  });

  test("an empty or whitespace-only cell is unset", () => {
    expect(isCoverFlag("")).toBe(false);
    expect(isCoverFlag("   ")).toBe(false);
    expect(isCoverFlag(null)).toBe(false);
    expect(isCoverFlag(undefined)).toBe(false);
  });
});

describe("splitCoverFlags", () => {
  test("only a comma makes it a list; everything else broadcasts", () => {
    expect(splitCoverFlags("x")).toEqual([true]);
    expect(splitCoverFlags(true)).toEqual([true]);
    expect(splitCoverFlags(1)).toEqual([true]);
    expect(splitCoverFlags("")).toEqual([false]);
  });

  test("a leading empty slot leaves the first category unclaimed", () => {
    // ", x" is the case the list form exists for: cover for the SECOND
    // category on the row, not the first.
    expect(splitCoverFlags(", x")).toEqual([false, true]);
    expect(splitCoverFlags("x, ")).toEqual([true, false]);
  });
});

describe("coverAt", () => {
  test("a single flag broadcasts to every slot", () => {
    expect(coverAt([true], 0)).toBe(true);
    expect(coverAt([true], 5)).toBe(true);
  });

  test("a list is positional", () => {
    expect(coverAt([false, true], 0)).toBe(false);
    expect(coverAt([false, true], 1)).toBe(true);
  });

  test("a list that ran short claims nothing past its end", () => {
    expect(coverAt([false, true], 2)).toBe(false);
    expect(coverAt([], 0)).toBe(false);
  });
});

describe("toCatOrder", () => {
  test("an empty cell is unnumbered, NOT zero", () => {
    // The whole point of the explicit empty check: Number("") is 0, which
    // would sort every unnumbered row to the front of its category.
    expect(toCatOrder("")).toBe(null);
    expect(toCatOrder("   ")).toBe(null);
    expect(toCatOrder(null)).toBe(null);
    expect(toCatOrder(undefined)).toBe(null);
  });

  test("parses numbers from either text or numeric cells", () => {
    expect(toCatOrder("20")).toBe(20);
    expect(toCatOrder(" 20 ")).toBe(20);
    expect(toCatOrder(20)).toBe(20);
    expect(toCatOrder("-1")).toBe(-1);
  });

  test("an explicit zero is a real position, not an empty cell", () => {
    expect(toCatOrder("0")).toBe(0);
    expect(toCatOrder(0)).toBe(0);
  });

  test("unparseable text is unnumbered rather than NaN", () => {
    expect(toCatOrder("first")).toBe(null);
    expect(toCatOrder("1st")).toBe(null);
  });
});

describe("splitCatOrders", () => {
  test("an empty cell yields no claims at all", () => {
    expect(splitCatOrders("")).toEqual([]);
    expect(splitCatOrders("  ")).toEqual([]);
    expect(splitCatOrders(null)).toEqual([]);
    expect(splitCatOrders(undefined)).toEqual([]);
  });

  test("lines up slot for slot with the category cell", () => {
    expect(splitCatOrders("20, 1")).toEqual([20, 1]);
  });

  test("an empty slot holds its place instead of collapsing", () => {
    // ", 1" has to keep the 1 in slot 2. Dropping the empty would slide it
    // into slot 1 and rank the wrong category.
    expect(splitCatOrders(", 1")).toEqual([null, 1]);
    expect(splitCatOrders("1, , 3")).toEqual([1, null, 3]);
  });

  test("an unparseable slot holds its place too", () => {
    expect(splitCatOrders("1, abc")).toEqual([1, null]);
  });
});

describe("catOrderAt", () => {
  test("a single bare number still applies to every category on the row", () => {
    // Pre-list behaviour: a sheet that never adopts the list form has to keep
    // sorting exactly as it did.
    expect(catOrderAt([7], 0)).toBe(7);
    expect(catOrderAt([7], 3)).toBe(7);
  });

  test("a list is positional", () => {
    expect(catOrderAt([20, 1], 0)).toBe(20);
    expect(catOrderAt([20, 1], 1)).toBe(1);
  });

  test("past the end of a list the row is unnumbered", () => {
    expect(catOrderAt([20, 1], 2)).toBe(null);
    expect(catOrderAt([], 0)).toBe(null);
  });
});

describe("buildCategoryCards", () => {
  test("one tile per distinct category, counting its rows", () => {
    const tiles = buildCategoryCards([
      row({ category: "Alaska" }),
      row({ category: "Alaska, Utah" }),
      row({ category: "Utah" }),
    ]);
    expect(tiles.map((t) => [t.name, t.count])).toEqual([
      ["Alaska", 2],
      ["Utah", 2],
    ]);
  });

  test("dedupes case-insensitively, keeping the casing seen first", () => {
    const tiles = buildCategoryCards([
      row({ category: "alaska" }),
      row({ category: "ALASKA" }),
      row({ category: "Alaska" }),
    ]);
    expect(tiles).toHaveLength(1);
    expect(tiles[0].name).toBe("alaska");
    expect(tiles[0].count).toBe(3);
  });

  test("unnumbered categories sort alphabetically", () => {
    const tiles = buildCategoryCards([
      row({ category: "Utah" }),
      row({ category: "alaska" }),
      row({ category: "Norway" }),
    ]);
    expect(tiles.map((t) => t.name)).toEqual(["alaska", "Norway", "Utah"]);
  });

  test("numbered categories come first, unnumbered fall to the bottom", () => {
    const tiles = buildCategoryCards([
      row({ category: "Alaska" }),
      row({ category: "Utah", cat_order: "20" }),
      row({ category: "Norway", cat_order: "10" }),
    ]);
    expect(tiles.map((t) => t.name)).toEqual(["Norway", "Utah", "Alaska"]);
  });

  test("a category takes the lowest number any of its rows claimed", () => {
    const tiles = buildCategoryCards([
      row({ category: "Utah", cat_order: "30" }),
      row({ category: "Utah", cat_order: "10" }),
      row({ category: "Norway", cat_order: "20" }),
    ]);
    expect(tiles.map((t) => t.name)).toEqual(["Utah", "Norway"]);
  });

  test("cat_order applies per slot, not to the whole row", () => {
    // The regression the list form was added to prevent: ranking a row 1st in
    // Greatest Hits used to drag Graphic Design to the front with it.
    const tiles = buildCategoryCards([
      row({ category: "Graphic Design, Greatest Hits", cat_order: "20, 1" }),
      row({ category: "Digest", cat_order: "10" }),
    ]);
    expect(tiles.map((t) => [t.name, t.order])).toEqual([
      ["Greatest Hits", 1],
      ["Digest", 10],
      ["Graphic Design", 20],
    ]);
  });

  test("an unnumbered slot leaves that category unnumbered", () => {
    const tiles = buildCategoryCards([
      row({ category: "Graphic Design, Digest", cat_order: ", 1" }),
    ]);
    const byName = Object.fromEntries(tiles.map((t) => [t.name, t.order]));
    expect(byName.Digest).toBe(1);
    expect(byName["Graphic Design"]).toBe(Number.POSITIVE_INFINITY);
  });

  test("the tile image is the row that claimed cover for THAT category", () => {
    const tiles = buildCategoryCards([
      row({ category: "Alaska", imageTiny: "first.webp" }),
      row({ category: "Alaska", cover: "x", imageTiny: "chosen.webp" }),
    ]);
    expect(tiles[0].imageTiny).toBe("chosen.webp");
  });

  test("cover applies per slot, so one row can cover just one of its categories", () => {
    const tiles = buildCategoryCards([
      row({ category: "Graphic Design", imageTiny: "gd-first.webp" }),
      row({
        category: "Graphic Design, Digest",
        cover: ", x",
        imageTiny: "digest-cover.webp",
      }),
    ]);
    const byName = Object.fromEntries(tiles.map((t) => [t.name, t.imageTiny]));
    expect(byName.Digest).toBe("digest-cover.webp");
    // The same row did NOT claim cover for Graphic Design, so that tile keeps
    // its first row's image.
    expect(byName["Graphic Design"]).toBe("gd-first.webp");
  });

  test("falls back to the first row when nothing claimed cover", () => {
    const tiles = buildCategoryCards([
      row({ category: "Alaska", imageTiny: "first.webp" }),
      row({ category: "Alaska", imageTiny: "second.webp" }),
    ]);
    expect(tiles[0].imageTiny).toBe("first.webp");
  });

  test("earliest claimant wins when several rows claim cover", () => {
    const tiles = buildCategoryCards([
      row({ category: "Alaska", cover: "x", imageTiny: "earlier.webp" }),
      row({ category: "Alaska", cover: "x", imageTiny: "later.webp" }),
    ]);
    expect(tiles[0].imageTiny).toBe("earlier.webp");
  });

  test("no rows means no tiles", () => {
    expect(buildCategoryCards([])).toEqual([]);
  });

  test("rows with no category contribute no tiles", () => {
    expect(buildCategoryCards([row({}), row({ category: "" })])).toEqual([]);
  });
});
