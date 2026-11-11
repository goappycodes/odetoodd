# Ode To Odd ERP: clickable prototype

A static prototype of every screen in the proposed Ode To Odd ERP, built by Appycodes. It runs on sample data, so nothing you enter is saved.

## What's in it

**Base system**
- Owner dashboard: sales by channel, orders due in 7 days (yellow) and overdue (red), low stock, pieces in production, output by stage and karigar
- Orders: Shopify and offline orders, order detail with stage tracking, new offline order with stock and material check
- Shopify sync log with failed syncs flagged
- Production orders: board and list views, stage detail with assignees and material requirement, mobile daily output entry
- Karigars, machines and vendors with output records
- Products and BOMs, raw materials, finished goods, stock movements, stock entry, suppliers
- Reports with filters and CSV export
- Settings: users and roles, configurable production stages, Excel/CSV imports with row checks, change history, daily summary email

**Add-ons** (marked in the sidebar)
- Material planning across all orders
- Sales and productivity analytics
- Two-way Shopify sync
- Consignment: store stock, weekly report reconciliation

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
