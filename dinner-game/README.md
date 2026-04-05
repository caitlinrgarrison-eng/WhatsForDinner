# What's For Dinner - Gamified MVP

A balanced MVP for couples to decide dinner quickly with:
- game-style mode selection (`Eat at Home`, `Takeout`, `Eat Out`)
- location-aware restaurant picks
- filters for cuisine, pricing, rating, and protein preferences (`no meat`, `chicken`, etc.)
- rewards loop with XP, streaks, and badges

## Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase client wiring for account auth flows
- Yelp Fusion API via secure server-side route

## Setup
1. Install dependencies:
   - `npm install`
2. Create `.env.local` from `.env.example`.
3. Add keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `YELP_API_KEY`
   - `GOOGLE_PLACES_API_KEY` (optional, for review/detail enrichment)
4. Run development server:
   - `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000).

## Supabase Schema
Run SQL from `supabase/schema.sql` in your Supabase SQL editor to create initial tables:
- `user_profiles`
- `sessions`
- `choices`
- `rewards_events`
- `user_badges`

## Notes
- If Yelp key is missing, the app uses high-quality fallback mock recommendations.
- If Google Places key is present, top Yelp results are enriched with Google review snippets and place details.
- `Takeout` currently uses Yelp takeout/delivery metadata with placeholders for future direct DoorDash/Uber Eats provider integrations.
- Basic analytics hooks are local and event-count based for MVP instrumentation.
