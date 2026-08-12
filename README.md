# Coffee Diversion Dashboard

A React + TypeScript progressive web application for tracking spent coffee grounds pickups, powered by Supabase and deployed to GitHub Pages.

## Features

- Public dashboard with metrics and visualizations
- Admin portal for pickup entry and store management
- PWA installable on mobile devices
- Supabase backend for live data storage
- GitHub Pages deployment

## Local Setup

1. Install Node.js and npm.
2. Run `npm install`.
3. Create a `.env` file with your Supabase configuration:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Start local development:
   ```
   npm run dev
   ```

## Build and Deploy

- `npm run build`
- `npm run deploy`

## Architecture and Implementation Plan

- See `ARCHITECTURE.md` for the full architecture design and phased implementation plan.

## Notes

- This scaffold includes PWA manifest support and Supabase client integration.
- Replace placeholder icons in `public/icons` with actual branded assets.
