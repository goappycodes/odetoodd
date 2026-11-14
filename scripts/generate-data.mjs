// Generates the demo JSON data in /data from the product catalogue.
// Run with: node scripts/generate-data.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "data");
mkdirSync(outDir, { recursive: true });

// Seeded random so the data is the same on every run
let seed = 20261111;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// A second stream for data added in round two, so the original data stays put
let seed2 = 20261114;
function rand2() {
  seed2 |= 0;
  seed2 = (seed2 + 0x6d2b79f5) | 0;
  let t = Math.imul(seed2 ^ (seed2 >>> 15), 1 | seed2);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int2 = (a, b) => a + Math.floor(rand2() * (b - a + 1));
const pick2 = (arr) => arr[Math.floor(rand2() * arr.length)];
const chance2 = (p) => rand2() < p;
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

const TODAY = new Date("2026-11-11T00:00:00Z");
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const iso = (d) => d.toISOString().slice(0, 10);
const isSunday = (d) => d.getUTCDay() === 0;

const COLOURS = {
  NB: "Navy Blue", OW: "Off White", BL: "Black", W: "White", EB: "Electric Blue",
  R: "Red", RP: "Rani Pink", BP: "Blush Pink",
};
const FABRICS = {
  "Mulberry Silk": { name: "Mulberry Silk", cost: 1450, supplier: "S01" },
  "Japanese Crepe": { name: "Japanese Crepe", cost: 980, supplier: "S02" },
  Crepe: { name: "Crepe", cost: 650, supplier: "S02" },
  "Organza Silk": { name: "Organza Silk", cost: 1200, supplier: "S06" },
  Organza: { name: "Organza Silk", cost: 1200, supplier: "S06" },
  Poplin: { name: "Cotton Poplin", cost: 320, supplier: "S07" },
};

// ---------- Suppliers ----------
const suppliers = [
  { id: "S01", name: "Varanasi Silk House", city: "Varanasi", category: "Silk fabrics", contact: "Arvind Mishra", phone: "+91 98390 4xxxx", leadTimeDays: 10 },
  { id: "S02", name: "Surat Crepe Mills", city: "Surat", category: "Crepe fabrics", contact: "Ketan Shah", phone: "+91 98251 6xxxx", leadTimeDays: 7 },
  { id: "S03", name: "Jaipur Trims & Co.", city: "Jaipur", category: "Beads, sequins, buttons", contact: "Sameer Jain", phone: "+91 98290 1xxxx", leadTimeDays: 3 },
  { id: "S04", name: "Kolkata Zari Works", city: "Kolkata", category: "Threads and zari", contact: "Debashis Pal", phone: "+91 98300 7xxxx", leadTimeDays: 6 },
  { id: "S05", name: "PackRight Jaipur", city: "Jaipur", category: "Packaging and labels", contact: "Neha Agarwal", phone: "+91 99280 2xxxx", leadTimeDays: 4 },
  { id: "S06", name: "Bengaluru Organza Co.", city: "Bengaluru", category: "Organza", contact: "Ravi Kumar", phone: "+91 98450 3xxxx", leadTimeDays: 8 },
  { id: "S07", name: "Erode Cotton Traders", city: "Erode", category: "Cotton fabrics and lining", contact: "S. Murugan", phone: "+91 94430 5xxxx", leadTimeDays: 6 },
];

// ---------- Low-stock levels per category ----------
// Finished goods: minimum ready pieces per style. Raw materials: default minimum for the category.
const FG_LEVELS = { Shirt: 3, "Co-ord Set": 2, Bib: 1, Skirt: 1, Dress: 1, Jacket: 0, Trouser: 0 };
const USD_RATE = 84;
const usdPrice = (inr) => Math.round((inr / USD_RATE) * 1.2 / 5) * 5; // international list price, rounded to $5

// ---------- Products ----------
const catalog = JSON.parse(readFileSync(join(root, "scripts", "catalog.json"), "utf8"));
const products = catalog.map(([name, type, sku, price, sizes, fabric, collection, mto, image]) => {
  const code = sku.split("/")[1];
  const colour = COLOURS[code] || "Multi";
  const sizeList = sizes.split("|");
  const freeSize = sizeList.length === 1;
  const stock = {};
  for (const s of sizeList) {
    if (s === "Custom") continue;
    stock[s] = freeSize ? int(0, 5) : chance(0.25) ? int(1, 2) : 0;
  }
  return {
    id: sku.toLowerCase().replace(/\//g, "-"),
    name, type, sku, price, sizes: sizeList,
    fabric: FABRICS[fabric]?.name || fabric,
    colour, collection, madeToOrder: !!mto, image,
    leadTimeDays: freeSize ? 21 : 30,
    stock,
    minStock: FG_LEVELS[type] ?? 0,
    status: "Active",
  };
});
for (const p of products) {
  p.priceIntl = usdPrice(p.price);
  const sampleSize = p.sizes.length === 1 ? p.sizes[0] : pick2(["S", "M"]);
  p.sampleStock = chance2(0.7) ? { [sampleSize]: chance2(0.25) ? 2 : 1 } : {};
}

// ---------- Materials ----------
const materials = [];
const fabricKey = (fabric, colour) => `${fabric}|${colour}`;
const fabricMaterial = {};
let mi = 1;
const mid = () => `RM${String(mi++).padStart(3, "0")}`;
for (const p of products) {
  const key = fabricKey(p.fabric, p.colour);
  if (fabricMaterial[key]) continue;
  const f = Object.values(FABRICS).find((x) => x.name === p.fabric);
  const min = 30;
  const m = {
    id: mid(), name: `${p.fabric}, ${p.colour}`, category: "Fabric", unit: "m",
    stock: chance(0.25) ? int(4, 26) : int(35, 140), minLevel: min,
    cost: f?.cost || 800, supplierId: f?.supplier || "S01",
  };
  fabricMaterial[key] = m.id;
  materials.push(m);
}
const other = [
  ["Cotton voile lining, Ivory", "Lining", "m", 260, "S07", 60],
  ["Silk embroidery thread, assorted", "Thread", "cone", 420, "S04", 40],
  ["Cotton embroidery floss, assorted", "Thread", "skein", 35, "S04", 200],
  ["Zari thread, antique gold", "Thread", "spool", 380, "S04", 25],
  ["Sewing thread, polyester", "Thread", "cone", 90, "S04", 30],
  ["Glass beads, assorted", "Trims", "g", 2.5, "S03", 1500],
  ["Sequins, matte", "Trims", "g", 3, "S03", 1000],
  ["Cutdana, gold", "Trims", "g", 4, "S03", 600],
  ["Shell buttons, 12 mm", "Trims", "pcs", 18, "S03", 300],
  ["Fabric-covered buttons", "Trims", "pcs", 22, "S03", 200],
  ["Invisible zip, 9 inch", "Trims", "pcs", 28, "S03", 80],
  ["Hook and eye sets", "Trims", "pcs", 6, "S03", 200],
  ["Elastic, 1 inch", "Trims", "m", 24, "S03", 40],
  ["Garment bag, cotton", "Packaging", "pcs", 85, "S05", 80],
  ["Tissue paper, printed", "Packaging", "sheet", 6, "S05", 300],
  ["Brand tag", "Packaging", "pcs", 9, "S05", 300],
  ["Size label", "Packaging", "pcs", 2, "S05", 400],
  ["Care label", "Packaging", "pcs", 2, "S05", 400],
  ["Gift box", "Packaging", "pcs", 140, "S05", 40],
];
const M = {};
for (const [name, category, unit, cost, supplierId, minLevel] of other) {
  const low = chance(0.22);
  const stock = low ? Math.round(minLevel * (0.2 + rand() * 0.6)) : Math.round(minLevel * (1.2 + rand() * 2.5));
  const m = { id: mid(), name, category, unit, stock, minLevel, cost, supplierId };
  materials.push(m);
  M[name.split(",")[0]] = m.id;
}

// ---------- BOMs ----------
const FABRIC_M = { Shirt: 2.4, Skirt: 3.2, Trouser: 2.6, Dress: 3.6, Jacket: 3.0, Bib: 1.2, "Co-ord Set": 5.2 };
const boms = products.map((p) => {
  const lines = [{ materialId: fabricMaterial[fabricKey(p.fabric, p.colour)], qty: FABRIC_M[p.type] ?? 2.5 }];
  if (["Skirt", "Dress", "Jacket", "Co-ord Set"].includes(p.type)) lines.push({ materialId: M["Cotton voile lining"], qty: p.type === "Co-ord Set" ? 2.4 : 1.6 });
  lines.push({ materialId: M["Silk embroidery thread"], qty: round(0.2 + rand() * 0.4, 1) });
  if (chance(0.5)) lines.push({ materialId: M["Zari thread"], qty: 0.2 });
  lines.push({ materialId: M["Glass beads"], qty: int(2, 6) * 10 });
  if (chance(0.6)) lines.push({ materialId: M["Sequins"], qty: int(1, 3) * 10 });
  if (chance(0.4)) lines.push({ materialId: M["Cutdana"], qty: int(1, 2) * 10 });
  if (p.type === "Shirt") lines.push({ materialId: M["Shell buttons"], qty: 8 });
  if (p.type === "Jacket") lines.push({ materialId: M["Fabric-covered buttons"], qty: 6 });
  if (["Skirt", "Dress", "Co-ord Set"].includes(p.type)) lines.push({ materialId: M["Invisible zip"], qty: 1 });
  if (["Skirt", "Bib", "Co-ord Set"].includes(p.type)) lines.push({ materialId: M["Hook and eye sets"], qty: 2 });
  if (p.type === "Trouser") lines.push({ materialId: M["Elastic"], qty: 0.8 });
  lines.push({ materialId: M["Sewing thread"], qty: 0.1 });
  lines.push({ materialId: M["Brand tag"], qty: 1 }, { materialId: M["Size label"], qty: 1 }, { materialId: M["Care label"], qty: 1 });
  lines.push({ materialId: M["Garment bag"], qty: 1 }, { materialId: M["Tissue paper"], qty: 2 });
  return { productId: p.id, version: "v1", updatedOn: iso(addDays(TODAY, -int(5, 90))), lines };
});

// ---------- Stages, people, machines, vendors ----------
const stages = [
  { id: "cutting", name: "Cutting", order: 1, avgDays: 1 },
  { id: "embroidery", name: "Embroidery / Adda", order: 2, avgDays: 9 },
  { id: "stitching", name: "Stitching", order: 3, avgDays: 3 },
  { id: "finishing", name: "Finishing", order: 4, avgDays: 2 },
  { id: "qc", name: "Quality check", order: 5, avgDays: 1 },
  { id: "packing", name: "Packing", order: 6, avgDays: 1 },
];
const karigars = [
  ["Mohd. Salim", "Embroidery karigar", "embroidery", 1.2],
  ["Rafiq Ansari", "Embroidery karigar", "embroidery", 1.0],
  ["Imran Khan", "Embroidery karigar", "embroidery", 1.1],
  ["Shabnam Bano", "Embroidery karigar", "embroidery", 0.9],
  ["Abdul Kalam", "Embroidery karigar", "embroidery", 1.0],
  ["Nasreen Begum", "Embroidery karigar", "embroidery", 0.8],
  ["Ramesh Kumar", "Master cutter", "cutting", 8],
  ["Suresh Yadav", "Tailor", "stitching", 3],
  ["Geeta Devi", "Tailor", "stitching", 3],
  ["Manoj Sharma", "Tailor", "stitching", 2.5],
  ["Pooja Saini", "Finisher", "finishing", 5],
  ["Kavita Meena", "Finisher", "finishing", 5],
  ["Anita Verma", "Quality checker", "qc", 10],
  ["Deepak Rawat", "Packer", "packing", 12],
].map(([name, role, stage, target], i) => ({
  id: `K${String(i + 1).padStart(2, "0")}`, name, role, stage, dailyTarget: target,
  joined: iso(addDays(TODAY, -int(200, 2400))), phone: `+91 9${int(100000000, 999999999)}`.replace(/\d{5}$/, "xxxxx"),
  status: "Active",
}));
const machines = [
  { id: "SN-01", name: "Single needle lockstitch 1", type: "Single needle", stage: "stitching", status: "Running" },
  { id: "SN-02", name: "Single needle lockstitch 2", type: "Single needle", stage: "stitching", status: "Running" },
  { id: "SN-03", name: "Single needle lockstitch 3", type: "Single needle", stage: "stitching", status: "Under repair" },
  { id: "OL-01", name: "Overlock 1", type: "Overlock", stage: "stitching", status: "Running" },
  { id: "AD-01", name: "Adda frame 1", type: "Adda frame", stage: "embroidery", status: "Running" },
  { id: "AD-02", name: "Adda frame 2", type: "Adda frame", stage: "embroidery", status: "Running" },
  { id: "AD-03", name: "Adda frame 3", type: "Adda frame", stage: "embroidery", status: "Running" },
  { id: "PR-01", name: "Steam press", type: "Press", stage: "finishing", status: "Running" },
];
const vendors = [
  { id: "V01", name: "Nizam Embroidery Unit", service: "Hand embroidery job work", stage: "embroidery", city: "Jaipur", phone: "+91 98291 xxxxx", activeJobs: 0 },
  { id: "V02", name: "Shree Dyeing House", service: "Dyeing and colour matching", stage: "cutting", city: "Sanganer", phone: "+91 94141 xxxxx", activeJobs: 0 },
  { id: "V03", name: "Lucknow Chikan Collective", service: "Chikankari job work", stage: "embroidery", city: "Lucknow", phone: "+91 98390 xxxxx", activeJobs: 0 },
  { id: "V04", name: "Press & Pack Services", service: "Finishing and pressing", stage: "finishing", city: "Jaipur", phone: "+91 99280 xxxxx", activeJobs: 0 },
];

// ---------- Orders ----------
const firstNames = ["Aanya", "Ishita", "Meera", "Riya", "Tara", "Nandini", "Kavya", "Sanya", "Aditi", "Radhika", "Zoya", "Mira", "Anushka", "Diya", "Pallavi", "Shruti", "Naina", "Ira", "Avni", "Tanvi", "Saanvi", "Gauri", "Rhea", "Malini"];
const lastNames = ["Kapoor", "Mehta", "Sharma", "Iyer", "Reddy", "Bose", "Singh", "Malhotra", "Nair", "Chopra", "Desai", "Banerjee", "Khanna", "Rao", "Gupta", "Sethi"];
const cities = ["Mumbai", "New Delhi", "Bengaluru", "Hyderabad", "Kolkata", "Pune", "Chennai", "Ahmedabad", "Gurugram", "Jaipur", "Chandigarh", "Lucknow", "Dubai", "London", "Singapore"];
const wholesaleBuyers = [
  { name: "The Loom Store", city: "Mumbai" },
  { name: "Atelier Nine", city: "New Delhi" },
  { name: "Kora Concept Store", city: "Bengaluru" },
  { name: "Saffron Lane Boutique", city: "Dubai" },
];
const offlineSources = ["Jaipur studio", "WhatsApp order", "Jaipur studio"];
const EVENTS = [
  { name: "Delhi pop-up, Bikaner House", daysAgo: 64, days: 2, city: "New Delhi" },
  { name: "Mumbai festive exhibition", daysAgo: 36, days: 3, city: "Mumbai" },
  { name: "Jaipur trunk show", daysAgo: 13, days: 1, city: "Jaipur" },
];
const sizeFor = (p) => {
  const sizes = p.sizes;
  if (sizes.length === 1) return sizes[0];
  return chance(0.18) ? "Custom" : pick(sizes.filter((s) => s !== "Custom"));
};

const orders = [];
let shopNo = 4218;
let whNo = 101;
let offNo = 301;
for (let d = 90; d >= 0; d--) {
  const date = addDays(TODAY, -d);
  const nShop = chance(0.15) ? 0 : int(0, 3) + (d < 25 ? 1 : 0);
  for (let k = 0; k < nShop; k++) {
    const nItems = chance(0.8) ? 1 : 2;
    const items = [];
    for (let j = 0; j < nItems; j++) {
      const p = pick(products);
      const size = sizeFor(p);
      items.push({ productId: p.id, size, qty: 1, price: p.price, ...(size === "Custom" ? { note: "Custom measurements received" } : {}) });
    }
    orders.push({ id: `SH-${shopNo}`, ref: `SH-${shopNo}`, shopifyRef: `#OTO${shopNo++}`, channel: "Shopify", customer: `${pick(firstNames)} ${pick(lastNames)}`, city: pick(cities), date: iso(date), items });
  }
  if (d % 16 === 5) {
    const b = wholesaleBuyers[(whNo - 101) % wholesaleBuyers.length];
    const items = [];
    const chosen = new Set();
    while (items.length < int(3, 5)) {
      const p = pick(products.filter((x) => x.sizes.length > 1 || chance(0.4)));
      if (chosen.has(p.id)) continue;
      chosen.add(p.id);
      items.push({ productId: p.id, size: p.sizes.length === 1 ? p.sizes[0] : "Size run (S-L)", qty: int(3, 8), price: Math.round(p.price * 0.55) });
    }
    orders.push({ id: `WHO-${whNo}`, ref: `WHO-${whNo++}`, channel: "Wholesale", customer: b.name, city: b.city, date: iso(date), items });
  }
  if (chance(0.12)) {
    const p = pick(products);
    const size = sizeFor(p);
    orders.push({ id: `OF-${offNo}`, ref: `OF-${offNo++}`, channel: "Offline", source: pick(offlineSources), customer: `${pick(firstNames)} ${pick(lastNames)}`, city: pick(["Jaipur", "New Delhi", "Mumbai"]), date: iso(date), items: [{ productId: p.id, size, qty: 1, price: p.price }] });
  }
}

// Event orders: sold off the rail at pop-ups and exhibitions, a few made to measure
let evNo = 101;
for (const ev of EVENTS) {
  for (let d = 0; d < ev.days; d++) {
    const date = addDays(TODAY, -ev.daysAgo + d);
    for (let k = 0; k < int2(3, 6); k++) {
      const p = pick2(products);
      const size = p.sizes.length === 1 ? p.sizes[0] : chance2(0.3) ? "Custom" : pick2(p.sizes.filter((x) => x !== "Custom"));
      orders.push({ id: `EV-${evNo}`, ref: `EV-${evNo++}`, channel: "Events", source: ev.name, customer: `${pick2(firstNames)} ${pick2(lastNames)}`, city: ev.city, date: iso(date), items: [{ productId: p.id, size, qty: 1, price: p.price, ...(size === "Custom" ? { note: "Measured at the event" } : {}) }] });
    }
  }
}

for (const o of orders) {
  const age = Math.round((TODAY - new Date(o.date + "T00:00:00Z")) / 86400000);
  const isW = o.channel === "Wholesale";
  const isEv = o.channel === "Events";
  const lead = isW ? 40 : isEv ? int2(26, 34) : int(26, 34);
  o.dueDate = iso(addDays(new Date(o.date + "T00:00:00Z"), lead));
  const fromStock = isEv
    ? o.items.every((it) => it.size !== "Custom")
    : !isW && o.items.every((it) => {
      const p = products.find((x) => x.id === it.productId);
      return p.sizes.length === 1 && chance(0.35);
    });
  o.fulfilment = fromStock ? "From stock" : "Make to order";
  const progress = age / lead + ((isEv ? rand2() : rand()) - 0.5) * 0.35;
  let status;
  if (isEv && fromStock) status = "Dispatched";
  else if (fromStock) status = age > 3 ? "Dispatched" : age > 1 ? "Ready to dispatch" : "New";
  else if (progress < 0.08) status = "New";
  else if (progress < 0.72) status = "In production";
  else if (progress < 0.85) status = "Quality check";
  else if (progress < 0.95) status = "Ready to dispatch";
  else status = "Dispatched";
  // keep a few late orders so the overdue view has something to show
  if (!isEv && !fromStock && status === "Dispatched" && age > lead - 4 && age < lead + 10 && chance(0.55)) status = pick(["In production", "In production", "Quality check"]);
  o.status = status;
  if (status === "Dispatched") {
    if (isEv && fromStock) {
      o.dispatchedOn = o.date;
      o.handedOver = true; // taken home from the event, nothing to ship
    } else {
      o.dispatchedOn = iso(addDays(new Date(o.date + "T00:00:00Z"), Math.min(age, fromStock ? (isEv ? int2(1, 3) : int(1, 3)) : lead - (isEv ? int2(0, 4) : int(0, 4)))));
      if (!isEv) int(10000000, 99999999); // keeps the random stream where it was
    }
  }
  o.subtotal = o.items.reduce((s, it) => s + it.qty * it.price, 0);
  o.total = o.subtotal;
  o.payment = o.channel === "Shopify" ? "Paid" : o.channel === "Wholesale" ? (status === "Dispatched" ? (isEv ? pick2 : pick)(["Paid", "Due in 30 days"]) : "Advance received") : "Paid";
}

// International orders use the international price list; custom orders carry a 10% markup
const INTL = new Set(["Dubai", "London", "Singapore"]);
for (const o of orders) {
  o.market = INTL.has(o.city) ? "International" : "Domestic";
  if (o.market === "International" && o.channel !== "Wholesale") {
    for (const it of o.items) {
      const p = products.find((x) => x.id === it.productId);
      it.priceUsd = p.priceIntl;
      it.price = p.priceIntl * USD_RATE;
    }
  }
  if (o.channel === "Offline" && o.source === "Jaipur studio" && chance2(0.3)) o.source = "Instagram DM";
  o.custom = o.channel !== "Wholesale" && (o.items.some((it) => it.size === "Custom") ? chance2(0.6) : chance2(0.04));
  o.subtotal = o.items.reduce((s, it) => s + it.qty * it.price, 0);
  o.markup = o.custom ? Math.round(o.subtotal * 0.1) : 0;
  o.total = o.subtotal + o.markup;
  if (o.custom && !o.items.some((it) => it.note)) o.items[0].note = pick2(["Sleeve length changed", "Lining colour changed", "Embroidery placement moved", "Neckline changed"]);
}
orders.sort((a, b) => (a.date < b.date ? 1 : -1));

// ---------- Production orders ----------
const staff = (stage) => karigars.filter((k) => k.stage === stage);
const productionOrders = [];
let poNo = 1;
const STAGE_FOR_STATUS = { New: 0, "In production": null, "Quality check": 4, "Ready to dispatch": 6, Dispatched: 6 };
for (const o of [...orders].reverse()) {
  if (o.fulfilment === "From stock") continue;
  for (const it of o.items) {
    const p = products.find((x) => x.id === it.productId);
    const qty = it.qty;
    let current = STAGE_FOR_STATUS[o.status];
    if (current === null) current = pick([1, 1, 1, 2, 2, 3]);
    if (current === 0 && chance(0.5)) current = 0;
    const start = addDays(new Date(o.date + "T00:00:00Z"), int(1, 3));
    const stageRows = stages.map((s, idx) => {
      let assignee = null;
      if (s.id === "embroidery") assignee = chance(0.2) ? { kind: "vendor", id: pick(["V01", "V03"]) } : { kind: "karigar", id: pick(staff("embroidery")).id };
      else if (s.id === "stitching") assignee = chance(0.5) ? { kind: "machine", id: pick(["SN-01", "SN-02", "OL-01"]), operator: pick(staff("stitching")).id } : { kind: "karigar", id: pick(staff("stitching")).id };
      else assignee = { kind: "karigar", id: pick(staff(s.id)).id };
      let completed = 0, rejected = 0, assigned = 0;
      if (idx < current) {
        assigned = qty;
        rejected = chance(s.id === "qc" ? 0.12 : 0.04) ? Math.max(1, Math.round(qty * 0.15)) : 0;
        completed = qty;
      } else if (idx === current) {
        assigned = qty;
        completed = qty > 1 ? int(0, qty - 1) : 0;
      }
      return { stage: s.id, assigned, completed, rejected, pending: assigned - completed, assignee };
    });
    const done = current >= stages.length;
    const due = addDays(new Date(o.dueDate + "T00:00:00Z"), -2);
    productionOrders.push({
      id: `PO-${String(poNo++).padStart(4, "0")}`,
      orderId: o.id, orderRef: o.ref, channel: o.channel,
      productId: p.id, size: it.size, qty, note: it.note || null,
      startDate: iso(start), dueDate: iso(due),
      completedOn: done ? (o.dispatchedOn ? iso(addDays(new Date(o.dispatchedOn + "T00:00:00Z"), -1)) : iso(addDays(TODAY, -int(0, 2)))) : null,
      currentStage: done ? "done" : stages[current].id,
      status: done ? "Completed" : current === 0 && stageRows[0].completed === 0 ? "Not started" : "In progress",
      priority: o.channel === "Wholesale" ? "Normal" : chance(0.2) ? "High" : "Normal",
      stages: stageRows,
    });
  }
}
productionOrders.reverse();
for (const v of vendors) v.activeJobs = productionOrders.filter((po) => po.status !== "Completed" && po.stages.some((s) => s.assignee?.kind === "vendor" && s.assignee.id === v.id && s.pending > 0)).length;

// ---------- Daily output log (last 35 days) ----------
const output = [];
const openPOs = productionOrders.filter((p) => p.status !== "Completed");
for (let d = 35; d >= 0; d--) {
  const date = addDays(TODAY, -d);
  if (isSunday(date)) continue;
  for (const k of karigars) {
    if (chance(0.07)) continue; // leave
    const t = k.dailyTarget;
    const completed = t < 2 ? (chance(t - Math.floor(t)) ? Math.ceil(t) : Math.floor(t)) : Math.max(0, Math.round(t * (0.6 + rand() * 0.6)));
    const rejected = completed > 0 && chance(k.stage === "qc" ? 0.25 : 0.06) ? 1 : 0;
    const po = pick(openPOs.length ? openPOs : productionOrders);
    output.push({ date: iso(date), karigarId: k.id, stage: k.stage, poId: po.id, completed, rejected, machineId: k.stage === "stitching" && chance(0.6) ? pick(["SN-01", "SN-02", "OL-01"]) : null });
  }
}

// ---------- Stock movements ----------
const movements = [];
let mvNo = 1;
const users = ["Rohit (Stores)", "Anjali (Production)", "Vikram (Stores)"];
for (let d = 30; d >= 0; d--) {
  const date = addDays(TODAY, -d);
  if (isSunday(date)) continue;
  for (let k = 0; k < int(2, 5); k++) {
    const m = pick(materials);
    const type = pick(["Issued", "Issued", "Issued", "Received", "Returned", "Consumed"]);
    const qty = m.unit === "g" ? int(5, 30) * 10 : m.unit === "m" ? round(int(4, 30) * 0.5, 1) : int(2, 20);
    const ref = type === "Received" ? `GRN-${int(500, 999)}` : pick(openPOs.length ? openPOs : productionOrders).id;
    movements.push({ id: `MV-${String(mvNo++).padStart(5, "0")}`, date: iso(date), itemType: "Material", itemId: m.id, type, qty: type === "Received" || type === "Returned" ? qty : -qty, unit: m.unit, ref, by: pick(users) });
  }
}
for (const o of orders.filter((x) => x.status === "Dispatched" && x.dispatchedOn >= iso(addDays(TODAY, -30)))) {
  for (const it of o.items) movements.push({ id: `MV-${String(mvNo++).padStart(5, "0")}`, date: o.dispatchedOn, itemType: "Product", itemId: it.productId, size: it.size, type: "Dispatched", qty: -it.qty, unit: "pcs", ref: o.ref, by: "Deepak (Dispatch)" });
}
for (const po of productionOrders.filter((p) => p.completedOn && p.completedOn >= iso(addDays(TODAY, -30)))) {
  movements.push({ id: `MV-${String(mvNo++).padStart(5, "0")}`, date: po.completedOn, itemType: "Product", itemId: po.productId, size: po.size, type: "Produced", qty: po.qty, unit: "pcs", ref: po.id, by: "Anjali (Production)" });
}
movements.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));

// ---------- Shopify sync log ----------
const syncLog = [];
for (const o of orders.filter((x) => x.channel === "Shopify").slice(0, 40)) {
  syncLog.push({ time: `${o.date}T${String(int(8, 22)).padStart(2, "0")}:${String(int(0, 59)).padStart(2, "0")}`, event: "Order created", ref: o.shopifyRef, status: "Synced", message: `${o.items.length} item(s) imported` });
}
syncLog.splice(3, 0, { time: `${iso(TODAY)}T09:42`, event: "Order created", ref: `#OTO${shopNo}`, status: "Failed", message: "SKU TP1516/GR not found in ERP product master. Add the SKU or map it, then retry." });
syncLog.splice(9, 0, { time: `${iso(addDays(TODAY, -1))}T18:05`, event: "Order created", ref: `#OTO${shopNo - 6}`, status: "Retried", message: "Shopify webhook timed out. Retried automatically after 2 minutes and imported." });
syncLog.splice(15, 0, { time: `${iso(addDays(TODAY, -3))}T11:20`, event: "Order updated", ref: `#OTO${shopNo - 14}`, status: "Failed", message: "Shipping address missing pincode. Order imported, address flagged for the sales team." });

// ---------- Consignment (add-on) ----------
// (AWB push events are added to the sync log after shipments are created)
const stores = [
  { id: "ST01", name: "The Loom Store", city: "Mumbai", terms: "35% margin, monthly settlement", since: "2025-03-01" },
  { id: "ST02", name: "Atelier Nine", city: "New Delhi", terms: "40% margin, monthly settlement", since: "2024-11-15" },
  { id: "ST03", name: "Kora Concept Store", city: "Bengaluru", terms: "35% margin, fortnightly settlement", since: "2025-08-01" },
  { id: "ST04", name: "Indigo House", city: "Jaipur", terms: "30% margin, monthly settlement", since: "2026-01-10" },
  { id: "ST05", name: "Studio Saanjh", city: "Hyderabad", terms: "38% margin, monthly settlement", since: "2026-05-20" },
];
const consignmentStock = [];
for (const s of stores) {
  const chosen = new Set();
  while (chosen.size < int(7, 11)) chosen.add(pick(products).id);
  for (const pid of chosen) {
    const sent = int(2, 8);
    const sold = int(0, sent);
    const returned = sold < sent && chance(0.3) ? int(0, sent - sold) : 0;
    consignmentStock.push({ storeId: s.id, productId: pid, sent, sold, returned, remaining: sent - sold - returned, lastSentOn: iso(addDays(TODAY, -int(10, 120))) });
  }
}
const consignmentReports = [];
for (let w = 0; w < 6; w++) {
  const weekEnd = addDays(TODAY, -((TODAY.getUTCDay() + 7) % 7) - 7 * w - 1);
  for (const s of stores) {
    const lines = consignmentStock.filter((c) => c.storeId === s.id && c.sold > 0 && chance(0.35)).map((c) => ({ productId: c.productId, reportedSold: 1, price: products.find((p) => p.id === c.productId).price }));
    const discrepancies = [];
    if (w === 0 && (s.id === "ST02" || s.id === "ST05")) {
      const c = consignmentStock.find((x) => x.storeId === s.id);
      discrepancies.push({ productId: c.productId, issue: `Store reports ${c.remaining + 2} in stock, ERP shows ${c.remaining}`, kind: "Count mismatch" });
      if (s.id === "ST02") discrepancies.push({ productId: "unknown", sku: "TP1599/OW", issue: "SKU in store report not found in ERP", kind: "Unknown SKU" });
    }
    consignmentReports.push({
      id: `CR-${s.id}-${iso(weekEnd)}`, storeId: s.id, weekEnding: iso(weekEnd),
      uploadedOn: iso(addDays(weekEnd, int(1, 3))), file: `${s.name.toLowerCase().replace(/[^a-z]+/g, "-")}-week-${iso(weekEnd)}.xlsx`,
      lines, unitsSold: lines.reduce((a, l) => a + l.reportedSold, 0), value: lines.reduce((a, l) => a + l.price * l.reportedSold, 0),
      status: discrepancies.length ? "Needs review" : "Reconciled", discrepancies,
    });
  }
}

// ---------- Consignment challans and consignment orders ----------
// Every movement of stock to a store goes out on a delivery challan, and is logged as a CON order
const challans = [];
const sizeLabel = (p) => (p.sizes.length === 1 ? p.sizes[0] : "Size run (S-L)");
let dcNo = 31;
let conNo = 101;
const conOrders = [];
for (const s of stores) {
  const rows = consignmentStock.filter((c) => c.storeId === s.id);
  const nCh = Math.min(rows.length, int2(2, 3));
  const dates = Array.from({ length: nCh }, () => int2(2, 120)).sort((a, b) => b - a).map((n) => iso(addDays(TODAY, -n)));
  const groups = dates.map(() => []);
  rows.forEach((r, i) => groups[i < nCh ? i : int2(0, nCh - 1)].push(r));
  dates.forEach((date, gi) => {
    const lines = groups[gi].map((r) => {
      const p = products.find((x) => x.id === r.productId);
      r.lastSentOn = r.lastSentOn > date ? r.lastSentOn : date;
      return { productId: r.productId, size: sizeLabel(p), qty: r.sent, mrp: p.price };
    });
    for (const r of groups[gi]) r.lastSentOn = date;
    const qty = lines.reduce((a, l) => a + l.qty, 0);
    const value = lines.reduce((a, l) => a + l.qty * l.mrp, 0);
    const id = `DC-2627-${String(dcNo++).padStart(3, "0")}`;
    const orderId = `CON-${conNo++}`;
    const age = Math.round((TODAY - new Date(date + "T00:00:00Z")) / 86400000);
    challans.push({
      id, orderId, storeId: s.id, date, lines, totalQty: qty, value,
      purpose: "Supply on consignment (sale or return), not a sale",
      transport: s.city === "Jaipur" ? { mode: "Hand delivery", provider: null, awb: null } : { mode: "Courier", provider: "Blue Dart", awb: null },
      status: age <= 3 ? "In transit" : "Received by store",
      receivedOn: age <= 3 ? null : iso(addDays(new Date(date + "T00:00:00Z"), s.city === "Jaipur" ? 0 : int2(2, 4))),
      preparedBy: pick2(["Rohit Saini", "Vikram Joshi"]),
    });
    conOrders.push({
      id: orderId, ref: orderId, channel: "Consignment", source: `Challan ${id}`, challanId: id, customer: s.name, city: s.city, date,
      items: lines.map((l) => ({ productId: l.productId, size: l.size, qty: l.qty, price: l.mrp })),
      dueDate: date, fulfilment: "From stock", status: "Dispatched", dispatchedOn: date,
      subtotal: value, markup: 0, total: value, custom: false, market: "Domestic", payment: "Settles as the store sells",
    });
  });
}
// one challan still being packed, so the flow shows a draft
{
  const s = stores[2];
  const picks = products.filter((p) => p.sizes.length === 1).slice(0, 3);
  const lines = picks.map((p) => ({ productId: p.id, size: sizeLabel(p), qty: 2, mrp: p.price }));
  const id = `DC-2627-${String(dcNo++).padStart(3, "0")}`;
  const orderId = `CON-${conNo++}`;
  const value = lines.reduce((a, l) => a + l.qty * l.mrp, 0);
  challans.push({ id, orderId, storeId: s.id, date: iso(TODAY), lines, totalQty: 6, value, purpose: "Supply on consignment (sale or return), not a sale", transport: { mode: "Courier", provider: "Blue Dart", awb: null }, status: "Draft", receivedOn: null, preparedBy: "Rohit Saini" });
  conOrders.push({ id: orderId, ref: orderId, channel: "Consignment", source: `Challan ${id}`, challanId: id, customer: s.name, city: s.city, date: iso(TODAY), items: lines.map((l) => ({ productId: l.productId, size: l.size, qty: l.qty, price: l.mrp })), dueDate: iso(addDays(TODAY, 2)), fulfilment: "From stock", status: "Ready to dispatch", subtotal: value, markup: 0, total: value, custom: false, market: "Domestic", payment: "Settles as the store sells" });
}
challans.sort((a, b) => (a.date < b.date ? 1 : -1));
orders.push(...conOrders);
orders.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
for (const c of challans.filter((x) => x.date >= iso(addDays(TODAY, -30)) && x.status !== "Draft")) {
  for (const l of c.lines) movements.push({ id: `MV-${String(mvNo++).padStart(5, "0")}`, date: c.date, itemType: "Product", itemId: l.productId, size: l.size, type: "Sent to store", qty: -l.qty, unit: "pcs", ref: c.id, by: c.preparedBy });
}
movements.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));

// ---------- Shipments (shipment tracking add-on) ----------
const CITY_HUB = { Mumbai: "Bhiwandi", "New Delhi": "Delhi Gateway", Bengaluru: "Bengaluru Hub", Hyderabad: "Hyderabad Hub", Kolkata: "Kolkata Hub", Pune: "Pune Hub", Chennai: "Chennai Hub", Ahmedabad: "Ahmedabad Hub", Gurugram: "Gurugram Hub", Jaipur: "Jaipur Hub", Chandigarh: "Chandigarh Hub", Lucknow: "Lucknow Hub", Dubai: "Dubai DXB", London: "London East Midlands", Singapore: "Singapore Changi" };
const PROVIDERS = {
  "Blue Dart": { transit: [2, 4], awb: () => `${int2(7, 9)}${int2(1000000000, 9999999999)}`.slice(0, 11) },
  Delhivery: { transit: [3, 6], awb: () => `${int2(1000000000000, 9999999999999)}`.slice(0, 13) },
  "DHL Express": { transit: [4, 7], awb: () => `${int2(1000000000, 9999999999)}` },
};
const shipments = [];
let shpNo = 1;
const shipTargets = [
  ...orders.filter((o) => o.status === "Dispatched" && !o.handedOver && o.channel !== "Consignment" && o.dispatchedOn >= iso(addDays(TODAY, -45))),
];
for (const c of challans.filter((x) => x.transport.mode === "Courier" && x.status !== "Draft")) shipTargets.push({ id: c.orderId, ref: c.orderId, channel: "Consignment", city: stores.find((s) => s.id === c.storeId).city, dispatchedOn: c.date, challanId: c.id, market: "Domestic" });
const stuckPlan = new Set();
const recent = shipTargets.filter((o) => o.dispatchedOn >= iso(addDays(TODAY, -14)) && o.market === "Domestic");
while (stuckPlan.size < Math.min(4, recent.length)) stuckPlan.add(pick2(recent).id);
let exceptionsLeft = 2;
for (const o of shipTargets.sort((a, b) => (a.dispatchedOn < b.dispatchedOn ? 1 : -1))) {
  const provider = o.market === "International" ? "DHL Express" : chance2(0.72) ? "Blue Dart" : "Delhivery";
  const P = PROVIDERS[provider];
  const shipped = new Date(o.dispatchedOn + "T00:00:00Z");
  const transit = int2(P.transit[0], P.transit[1]);
  const expectedBy = iso(addDays(shipped, transit));
  const age = Math.round((TODAY - shipped) / 86400000);
  const hub = CITY_HUB[o.city] ?? `${o.city} Hub`;
  const events = [{ date: o.dispatchedOn, time: "17:40", location: "Jaipur", text: "Picked up from Ode To Odd studio" }];
  let status;
  let stuck = stuckPlan.has(o.id) && age >= 4;
  if (stuck) {
    const mid = pick2(["Nagpur Hub", "Indore Hub", "Ahmedabad Hub", "Delhi Gateway"]);
    events.push({ date: o.dispatchedOn, time: "22:10", location: "Jaipur Hub", text: "In transit" });
    events.push({ date: iso(addDays(shipped, 1)), time: "06:15", location: mid, text: "Arrived at transit hub" });
    status = "In transit";
  } else if (age >= transit) {
    events.push({ date: o.dispatchedOn, time: "22:10", location: "Jaipur Hub", text: "In transit" });
    events.push({ date: iso(addDays(shipped, transit - 1)), time: "05:30", location: hub, text: "Arrived at destination hub" });
    if (exceptionsLeft > 0 && age <= 9 && chance2(0.35)) {
      exceptionsLeft--;
      events.push({ date: iso(addDays(shipped, transit)), time: "13:20", location: o.city, text: o.market === "International" ? "Held at customs, awaiting duty payment" : "Delivery attempted, customer not available" });
      status = "Exception";
    } else {
      events.push({ date: iso(addDays(shipped, transit)), time: "09:05", location: o.city, text: "Out for delivery" });
      events.push({ date: iso(addDays(shipped, transit)), time: `${String(int2(11, 19)).padStart(2, "0")}:${String(int2(0, 59)).padStart(2, "0")}`, location: o.city, text: "Delivered" });
      status = "Delivered";
    }
  } else {
    events.push({ date: o.dispatchedOn, time: "22:10", location: "Jaipur Hub", text: "In transit" });
    if (age >= 1) events.push({ date: iso(addDays(shipped, Math.min(age, transit - 1))), time: "05:30", location: age >= transit - 1 ? hub : "Delhi Gateway", text: age >= transit - 1 ? "Arrived at destination hub" : "In transit" });
    status = "In transit";
  }
  const order = orders.find((x) => x.id === o.id);
  const awb = P.awb();
  if (order) { order.awb = awb; order.courier = provider; }
  const challan = challans.find((c) => c.id === o.challanId);
  if (challan) { challan.transport.awb = awb; challan.transport.provider = provider; }
  const last = events[events.length - 1];
  shipments.push({
    id: `SHP-${String(shpNo++).padStart(4, "0")}`, orderId: o.id, orderRef: o.ref, channel: o.channel, provider, awb,
    destination: o.city, market: o.market, shippedOn: o.dispatchedOn, expectedBy, status,
    deliveredOn: status === "Delivered" ? last.date : null,
    lastScan: last, events: [...events].reverse(),
    shopifySync: o.channel !== "Shopify" ? "Not applicable" : age <= 0 && chance2(0.5) ? "Pending" : "Synced",
  });
}
// a Shopify order that was already fulfilled in Shopify, so the AWB push failed
const failedSync = shipments.filter((x) => x.shopifySync === "Synced")[2];
if (failedSync) failedSync.shopifySync = "Failed";
if (failedSync) failedSync.shopifyMessage = "Order already marked fulfilled in Shopify with a different AWB. Choose which AWB to keep.";

// ---------- PR tracker (add-on) ----------
const prRecipients = [
  ["Meher Kohli", "Stylist, magazine editorial"],
  ["Tanvi Arora", "Stylist, celebrity wardrobe"],
  ["@thestylediaryy", "Instagram creator"],
  ["Studio Lumen", "Wedding lookbook shoot"],
  ["Kabir Sethi", "Photographer, campaign test"],
  ["@saree.and.soul", "Instagram creator"],
  ["Rhea Malik", "Stylist, music video"],
  ["Weekend Edit", "Online magazine feature"],
];
const prLoans = [];
for (let i = 0; i < 22; i++) {
  const withSample = products.filter((x) => Object.keys(x.sampleStock).length);
  const p = chance2(0.75) ? pick2(withSample) : pick2(products);
  const issued = addDays(TODAY, -int2(1, 75));
  const dueBack = addDays(issued, int2(5, 14));
  const fromSample = Object.keys(p.sampleStock).length > 0 && chance2(0.85);
  const size = fromSample ? Object.keys(p.sampleStock)[0] : p.sizes.length === 1 ? p.sizes[0] : pick2(["S", "M"]);
  const [recipient, purpose] = pick2(prRecipients);
  const overdueDays = Math.round((TODAY - dueBack) / 86400000);
  const returned = overdueDays > 0 ? chance2(0.72) : chance2(0.1);
  const returnedOn = returned ? iso(addDays(dueBack, Math.min(int2(-3, 6), Math.max(-3, overdueDays)))) : null;
  prLoans.push({
    id: `PR-${String(i + 1).padStart(3, "0")}`, productId: p.id, size, qty: 1,
    stockType: fromSample ? "Sample" : "Main", recipient, purpose,
    issuedOn: iso(issued), dueBack: iso(dueBack), returnedOn: returnedOn && returnedOn > iso(TODAY) ? iso(TODAY) : returnedOn,
    condition: returned ? pick2(["Good", "Good", "Good", "Needs steaming", "Minor bead loss, sent for repair"]) : null,
    issuedBy: pick2(["Simran Kaur", "Owner"]),
    coverage: returned && chance2(0.5) ? pick2(["Instagram reel, 42k views", "Print feature, Dec issue", "Lookbook, 6 images", "Story mention"]) : null,
  });
}
prLoans.sort((a, b) => (a.issuedOn < b.issuedOn ? 1 : -1));

const categoryLevels = {
  finished: Object.entries(FG_LEVELS).map(([category, minPerStyle]) => ({ category, minPerStyle })),
  materials: [
    { category: "Fabric", unit: "m", defaultMin: 30 },
    { category: "Lining", unit: "m", defaultMin: 60 },
    { category: "Thread", unit: "cone/spool", defaultMin: 25 },
    { category: "Trims", unit: "pcs/g", defaultMin: 200 },
    { category: "Packaging", unit: "pcs", defaultMin: 80 },
  ],
  shipmentStuckDays: 3,
  prReminderDays: 2,
};

// ---------- Sales by day ----------
const salesDaily = [];
for (let d = 90; d >= 0; d--) {
  const date = iso(addDays(TODAY, -d));
  const row = { date, Shopify: 0, Wholesale: 0, Events: 0, Offline: 0, Consignment: 0 };
  // consignment orders move stock, they aren't sales: store sales come from the weekly reports
  for (const o of orders.filter((x) => x.date === date && x.channel !== "Consignment")) row[o.channel] += o.total;
  salesDaily.push(row);
}
for (const r of consignmentReports) {
  const row = salesDaily.find((x) => x.date === r.uploadedOn);
  if (row) row.Consignment += Math.round(r.value * 0.63);
}
// earlier consignment weeks so the 90 day view isn't empty
for (const row of salesDaily) if (row.date < iso(addDays(TODAY, -40)) && new Date(row.date).getUTCDay() === 2) row.Consignment += int(3, 9) * 14000;

// ---------- Users and roles ----------
const roles = [
  { id: "management", name: "Management", description: "Full access, including the owner dashboard, reports and settings" },
  { id: "production", name: "Production", description: "Production orders, daily output, karigars, machines and vendors" },
  { id: "inventory", name: "Inventory", description: "Materials, stock entries, suppliers and BOMs" },
  { id: "sales", name: "Sales", description: "Orders, customers, Shopify sync and dispatch" },
];
const appUsers = [
  { id: "U1", name: "Owner", email: "owner@odetoodd.com", role: "management", lastActive: `${iso(TODAY)} 10:12` },
  { id: "U2", name: "Anjali Rathore", email: "production@odetoodd.com", role: "production", lastActive: `${iso(TODAY)} 09:48` },
  { id: "U3", name: "Rohit Saini", email: "stores@odetoodd.com", role: "inventory", lastActive: `${iso(TODAY)} 08:55` },
  { id: "U4", name: "Vikram Joshi", email: "stores2@odetoodd.com", role: "inventory", lastActive: `${iso(addDays(TODAY, -1))} 18:20` },
  { id: "U5", name: "Simran Kaur", email: "sales@odetoodd.com", role: "sales", lastActive: `${iso(TODAY)} 10:30` },
  { id: "U6", name: "Deepak Rawat", email: "dispatch@odetoodd.com", role: "sales", lastActive: `${iso(addDays(TODAY, -1))} 17:02` },
];
const permissions = [
  ["Owner dashboard", ["management"]],
  ["Products and BOMs", ["management", "inventory", "production"]],
  ["Materials and stock entries", ["management", "inventory"]],
  ["Orders", ["management", "sales"]],
  ["Production orders", ["management", "production"]],
  ["Daily output entry", ["management", "production"]],
  ["Karigars, machines and vendors", ["management", "production"]],
  ["Reports and exports", ["management", "production", "inventory", "sales"]],
  ["Settings and users", ["management"]],
].map(([area, allowed]) => ({ area, allowed }));

const changeLog = [
  { time: `${iso(TODAY)} 10:02`, user: "Rohit Saini", action: "Updated minimum level", detail: "Mulberry Silk, Off White: 25 m to 30 m" },
  { time: `${iso(TODAY)} 09:31`, user: "Anjali Rathore", action: "Reassigned stage", detail: `${productionOrders.find((p) => p.status !== "Completed")?.id}: Embroidery moved to Nizam Embroidery Unit` },
  { time: `${iso(addDays(TODAY, -1))} 17:45`, user: "Owner", action: "Changed product price", detail: "Old Pages Set: ₹54,900 to ₹55,900" },
  { time: `${iso(addDays(TODAY, -1))} 15:10`, user: "Rohit Saini", action: "Uploaded BOM file", detail: "bom-festive-2026.xlsx: 12 products updated" },
  { time: `${iso(addDays(TODAY, -2))} 12:05`, user: "Simran Kaur", action: "Edited order due date", detail: "WHO-105: due date moved by 5 days at buyer request" },
  { time: `${iso(addDays(TODAY, -3))} 11:40`, user: "Owner", action: "Added user", detail: "Deepak Rawat, Sales role" },
];

for (const sh of shipments.filter((x) => x.channel === "Shopify" && x.shopifySync !== "Not applicable").slice(0, 6)) {
  const o = orders.find((x) => x.id === sh.orderId);
  syncLog.push({ time: `${sh.shippedOn}T${String(int2(18, 21)).padStart(2, "0")}:${String(int2(0, 59)).padStart(2, "0")}`, event: "AWB pushed", ref: o.shopifyRef, status: sh.shopifySync === "Failed" ? "Failed" : sh.shopifySync === "Pending" ? "Retried" : "Synced", message: sh.shopifySync === "Failed" ? sh.shopifyMessage : `${sh.provider} ${sh.awb} added to the Shopify fulfilment. Customer notified.` });
}
syncLog.sort((a, b) => (a.time < b.time ? 1 : -1));

changeLog.unshift(
  { time: `${iso(TODAY)} 10:20`, user: "Owner", action: "Changed low-stock level", detail: "Shirts: minimum ready pieces per style 2 to 3" },
  { time: `${iso(TODAY)} 09:15`, user: "Simran Kaur", action: "Marked order as custom", detail: `${orders.find((o) => o.custom && o.channel === "Shopify")?.ref}: 10% custom markup applied` },
);

const company = { name: "Ode To Odd", today: iso(TODAY), currency: "INR" };

const files = { company, products, materials, suppliers, boms, stages, karigars, machines, vendors, orders, productionOrders, output, movements, syncLog, stores, consignmentStock, consignmentReports, challans, shipments, prLoans, categoryLevels, salesDaily, roles, users: appUsers, permissions, changeLog };
for (const [name, data] of Object.entries(files)) writeFileSync(join(outDir, `${name}.json`), JSON.stringify(data, null, 1));
console.log(Object.entries(files).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : "obj"}`).join("\n"));
