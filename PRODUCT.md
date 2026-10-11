# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
People who want to watch a sky event (an eclipse, a meteor shower, a launch) and need to know where within reach the sky will be clear and dark. Also HackPHS 2026 judges, who see the landing page first.

## Product Purpose
Orion aggregates sky events and shows a weather-and-visibility heatmap of where to watch them, hour by hour. The landing page has one job: get a visitor to click Get Started, which opens the map at `/map`.

## Positioning
Event listings plus live weather in one place, with a heatmap of where within reach the sky will be clear. Existing event trackers list events without this.

## Operating Context
Built for HackPHS 2026 (theme "Into the Skies", software only). Next.js 16 front end on port 3000; a Flask login backend is reached through Next rewrites. Demo event: the April 8, 2024 total solar eclipse, replayed with weather from September 12, 2026.

## Capabilities & Constraints
- Landing copy that exists: the ORION wordmark, "Welcome, Stargazer", the Get Started button (links to `/map`), and one description line reused verbatim from `src/app/layout.tsx`: "Pick a sky event. See where within reach the sky will be clear and dark, hour by hour."
- No new claims, stats, or features may be invented for the page.
- The side menu rail (72px, left) appears on every page and must stay usable.
- Light/dark mode is site-wide: the landing page plays a sunrise/sunset on switch and the Google map follows the theme.
- Open: whether the Flask copy of the landing page (`Orion/landing/templates/index.html`) should redirect to the Next.js page.

## Brand Commitments
Name: Orion. Space-themed (user's words). The existing Earth-limb horizon, moon and constellation are kept as ideas.

## Evidence on Hand
No testimonials, customer counts, or benchmarks exist. None may be fabricated.

## Product Principles
- The page earns one click: Get Started.
- Say only what the product does today.
- The map and heatmap stay readable in both themes.

## Accessibility & Inclusion
Respect `prefers-reduced-motion`; text contrast meets WCAG AA in both themes; the theme toggle is keyboard-operable with an accessible name.
