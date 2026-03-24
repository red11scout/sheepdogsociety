# SheepDog Society — Project Todo

## Phase 1: Infrastructure ✅
- [x] Lazy DB init for Vercel build compatibility
- [x] Update middleware with public routes
- [x] Create public route group with layout (navbar + footer)
- [x] Add new DB tables: locations, locationRequests, locationInterests, contactSubmissions, newsletterSubscribers
- [x] Add schema columns: resources (category, level, seriesName), events (eventType, imageUrl, maxAttendees), scriptureOfDay (seriesId, seriesName, dayInSeries), blogPosts (category, isFeatured), messages (isPinned)

## Phase 2: Public Pages ✅
- [x] Landing page (/) — hero, mission, foundation, how we gather, CTA
- [x] Get Started (/get-started) — 5 core principles, what to expect, how to join
- [x] FAQ (/faq) — 12 questions with Accordion
- [x] About (/about) — mission, Acts 20:28, leadership model, what we believe, culture
- [x] How We Gather (/how-we-gather) — 4 tiers with group size guidelines
- [x] Contact (/contact) — form with topic selection
- [x] Giving (/giving) — why, ways, partners
- [x] Partnerships (/partnerships) — 5 partnership paths
- [x] Stories (/stories) — approved testimonies from DB

## Phase 3: Location/Map System ✅
- [x] Mapbox map component with custom markers, popups, geolocation
- [x] Location finder page (/locations) — map + search + filter + results
- [x] Location detail page (/locations/[id]) — details + interest form
- [x] Request new location page (/locations/request) — application form
- [x] Public API routes (GET locations, GET location, POST interest, POST request)
- [x] Admin API routes (GET/POST locations, GET/PATCH location-requests)
- [x] Admin locations management page
- [x] Admin location requests review page
- [x] Sidebar admin links for locations

## Phase 4: Newsletter & Contact API ✅
- [x] Newsletter signup component in footer
- [x] POST /api/public/newsletter route
- [x] POST /api/public/contact route

## Phase 5: Deploy & Verify
- [ ] Push schema changes to Supabase (`npx drizzle-kit push`)
- [ ] Deploy to Vercel
- [ ] Set Mapbox token env var
- [ ] Verify all public pages render
- [ ] Verify auth flow
- [ ] Verify map loads (needs Mapbox token)
- [ ] Test contact/newsletter forms
- [ ] Set custom domain

## Future Enhancements
- [ ] Leader tools hub (/leader/dashboard, /leader/training, /leader/location)
- [ ] 14-day themed scripture series generation UI
- [ ] Public blog (move published posts to public route)
- [ ] Q&A channel type for chat
- [ ] Resource category/level filter UI
- [ ] Event type tabs UI
- [ ] Online groups support
- [ ] Email notifications (Resend)
- [ ] SEO (sitemap, robots, OG tags)
- [ ] Gear store external links page
