# Coffee Diversion Dashboard Architecture

## Goals

- Replace spreadsheets/Alteryx/Tableau with a modern code-based dashboard.
- Minimize cost, maintenance, hosting complexity, and vendor lock-in.
- Support a single admin entering data and a public-facing analytics dashboard.
- Keep the system portable and production-ready for years of historical data.

## Recommended architecture

### Frontend
- `React` with `TypeScript`
- `Material UI` for responsive UI, layout, cards, tables, and form controls
- Single-page application with two main routes:
  - `/` public dashboard
  - `/admin` admin portal
- Use `recharts` or a lightweight chart library for visualization
- Use `BrowserRouter` for URL-based filter state persistence

### Backend / Database
- `Supabase` as a managed Postgres backend
- Direct client access from frontend using `@supabase/supabase-js`
- No custom server layer required
- Store data in normalized tables and compute metrics in SQL or client-side

### Hosting
- `GitHub Pages` for static app hosting
- GitHub Actions for automatic build and deployment
- Static hosting keeps complexity extremely low

### Authentication
- `Supabase Auth` for admin login
- Public dashboard is anonymous read-only
- Secure writes and admin panel access using Row Level Security (RLS)

### PWA
- `manifest.json` and a basic service worker for installability
- Mobile-first responsive navigation
- Offline shell support for the dashboard UI
- No native app required

## Data model

### Stores
- `id` (UUID)
- `store_number` (text)
- `store_name` (text)
- `city` (text)
- `state` (text)
- `active` (boolean)

### Pickups
- `id` (UUID)
- `pickup_date` (date)
- `store_id` (UUID, foreign key)
- `scg_mass_lbs` (numeric)
- `cardboard_lbs` (numeric)
- `food_waste_lbs` (numeric)
- `miles_driven` (numeric)
- `number_of_days_between_pickups` (integer)
- `pickup_initiated_by` (text)
- `notes` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Calculated metrics

The app will compute these values from existing data:
- Net Pounds
- Running Total
- Weekly SCG
- Monthly SCG
- Yearly SCG
- YTD SCG
- Average Weekly SCG
- Average Daily SCG
- CO2e Diverted
- Methane Diverted
- Store Rankings
- Active Stores

These can be implemented as:
- SQL views or aggregate queries in Supabase
- client-side calculations from query results

## Architecture design

### Public dashboard flow

1. Public user visits `/`
2. App loads filters from the URL
3. App queries Supabase for `stores` and `pickups`
4. App computes aggregates and chart data
5. Filters, charts, and KPI cards render
6. User can export filtered data to CSV/Excel

### Admin portal flow

1. Admin visits `/admin`
2. Admin authenticates with Supabase
3. Admin can manage stores and enter pickups
4. App writes directly to Supabase
5. Supabase updates are immediately available to the public dashboard

### Data access model

- `stores` and `pickups` are readable by public clients
- `pickups` and `stores` are writable only by authenticated admin users
- Keep auth rules minimal and explicit

## Folder structure

A simple app structure supports this architecture:

- `src/`
  - `components/` shared UI components
  - `pages/` route pages (`DashboardPage`, `AdminPage`, `NotFoundPage`)
  - `lib/` Supabase client and helpers
  - `types/` shared TypeScript interfaces
  - `styles.css`
- `public/` static assets and PWA icons
- `supabase/` SQL schema and policy files
- `.github/workflows/` deployment pipeline

## Phased implementation plan

### Phase 1: Core foundation
- Scaffold React + TypeScript app
- Configure Supabase client integration
- Build layout, routing, and theme toggling
- Create `stores` and `pickups` schema
- Add public dashboard and admin route placeholders
- Setup GitHub Pages deployment workflow

### Phase 2: Public dashboard MVP
- Build KPI cards and summary metrics
- Add filter controls: Year, Quarter, Month, Store, Date Range
- Implement chart skeletons for ranking, trend, and running totals
- Add pickup log table with sorting/searching/filtering
- Add CSV export for filtered data

### Phase 3: Admin data entry MVP
- Implement Supabase Auth for admin login
- Build store management CRUD pages
- Build pickup entry/edit form
- Add historical pickup log page
- Add form validation and save confirmation

### Phase 4: Advanced analytics
- Implement all calculated metrics and derived aggregates
- Add weekly/monthly/yearly charts and heatmap
- Add store ranking and active store cards
- Add click-to-filter chart interactions
- Persist filters to the URL

### Phase 5: PWA and mobile polish
- Add service worker and offline shell support
- Ensure install-to-home-screen behavior works
- Optimize responsive layouts for phones/tablets
- Add dark/light mode polish
- Add export to Excel capability

### Phase 6: Production hardening
- Review Supabase RLS policies and auth flows
- Add environment variable docs and `.env.example`
- Test on Android/iOS devices
- Configure GitHub Pages deployment and versioning
- Add README and architecture documentation

## Why this plan works

- It separates foundation, public reporting, admin workflows, analytics, and PWA support.
- It keeps early releases simple while allowing incremental delivery.
- The app remains maintainable and portable.
- It avoids unnecessary backend complexity and vendor lock-in.

## Minimal functionality with maximum portability

This architecture prioritizes:
- static frontend portability
- managed database service simplicity
- direct client DB integration for real-time updates
- lightweight hosting on GitHub Pages
- standard SQL data modeling for future migration
