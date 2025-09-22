// node >= 18
import { writeFile } from "node:fs/promises";

const API = "https://api.tcgdx.net/v2";
const lang = "en";
const today = new Date().toISOString().slice(0,10);

const get = async (path) => {
  const r = await fetch(`${API}/${lang}/${path}`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
};

// Normalize set to your schema
const mapSet = (s) => ({
  code: s.id,                               // e.g. "A1"
  name: s.name,
  series: "Pocket",
  total: s.cardCount?.official ?? s.cardCount?.total ?? null,
  releaseDate: s.releaseDate ?? null,
  released: s.releaseDate ? s.releaseDate <= today : false,
  symbolImage: s.symbol ?? null,
  logoImage: s.logo ?? null
});

// Normalize card to your schema
const mapCard = (c, set) => ({
  id: `${set.id}-${c.localId ?? c.number ?? c.id}`,
  name: c.name,
  setCode: set.id,
  setName: set.name,
  number: String(c.localId ?? c.number ?? ""),
  rarity: c.rarity ?? null,
  type: Array.isArray(c.types) ? c.types[0] : (c.types ?? null),
  subtypes: c.category ? [c.category].filter(Boolean) : (c.subtypes ?? []),
  hp: c.hp ? Number(c.hp) : null,
  attacks: (c.attacks ?? []).map(a => ({
    name: a.name,
    cost: a.cost ?? [],
    damage: String(a.damage ?? ""),
    text: a.effect ?? ""
  })),
  weaknesses: (c.weaknesses ?? []).map(w => ({ type: w.type, value: w.value })),
  retreatCost: Array.isArray(c.retreat) ? c.retreat : (c.retreat ? Array(c.retreat).fill("Colorless") : []),
  illustrator: c.illustrator ?? null,
  legalities: { pocket: "legal" },
  images: { small: c.image ?? null, large: c.image ?? null },
  releaseDate: c.releaseDate ?? set.releaseDate ?? null,
  released: (c.releaseDate ?? set.releaseDate ?? "") <= today,
  language: lang
});

async function main() {
  // Pocket lives under series "tcgp"
  const series = await get("series/tcgp"); // { sets: [{ id, name, ...}] }
  const outSets = [];
  const outCards = [];

  for (const { id } of series.sets ?? []) {
    const setFull = await get(`sets/${id}`);  // includes cards
    outSets.push(mapSet(setFull));
    for (const c of (setFull.cards ?? [])) outCards.push(mapCard(c, setFull));
  }

  await writeFile("data/sets.json", JSON.stringify(outSets, null, 2));
  await writeFile("data/cards.json", JSON.stringify(outCards, null, 2));
  console.log(`Wrote ${outSets.length} sets and ${outCards.length} cards`);
}

main().catch(e => { console.error(e); process.exit(1); });