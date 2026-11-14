# Ode To Odd ERP: clickable prototype

A static prototype of every screen in the proposed Ode To Odd ERP, built by Appycodes. It runs on sample data, so nothing you enter is saved.

## What's in it

**Base system**
- Owner dashboard: sales by channel, orders due in 7 days (yellow) and overdue (red), low stock, pieces in production, output by stage and karigar, delayed shipments and unreturned PR pieces
- Orders: tabs by source with their own number series (SH Shopify, WHO wholesale, CON consignment, EV events, OF studio and offline), order detail with stage tracking and shipment, manual entry with domestic or international pricing, custom orders with a 10% markup, bulk CSV import
- Shopify sync log with failed syncs flagged
- Production orders: board and list views, stage detail with assignees and material requirement, mobile daily output entry
- Karigars, machines and vendors with output records
- Products and BOMs with photo upload and separate domestic and international prices, raw materials with a photo for each, finished goods (main and sample stock), stock movements, stock entry, suppliers
- Reports with filters and CSV export, including sales by store, category, channel and SKU
- Settings: users and roles, configurable production stages, low-stock levels per category, Excel/CSV imports with row checks (products, raw materials with photos, BOMs, stock, orders), change history, daily summary email

**Add-ons** (marked in the sidebar)
- Material planning across all orders
- Sales and productivity analytics
- Two-way Shopify sync
- Consignment: store stock, what's selling at each store, a delivery challan for every movement to a store, weekly report reconciliation
- Shipment tracking: AWB and courier per order, tracking from Blue Dart, DHL and Delhivery, delayed and stalled shipments flagged, AWB synced to Shopify
- PR tracker: pieces given out for shoots from sample or main stock, return status, overdue pieces flagged

## Data

All data lives in `data/*.json`. Products, SKUs, prices and images come from the public odetoodd.com catalogue. Everything else (orders, stock, karigars, production) is generated:

```bash
node scripts/generate-data.mjs
```

The prototype's "today" is fixed at 11 November 2026 so the dates in the data stay consistent.

## Run it

```bash
npm install
npm run dev
```

`npm run build` exports a fully static site to `out/`.
