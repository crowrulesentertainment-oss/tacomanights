# Tacoma Nights Network

**The City Has a Voice.**  
A CrowRules Entertainment community television and participation network for Tacoma, Pierce County, the South Sound and beyond.

## Rebuild direction
- Hybrid cinematic streaming + futuristic television network + community platform.
- Network-first homepage.
- Mobile-first, accessible, static HTML/CSS/JavaScript frontend.
- Supabase for authentication, database, moderation and private production storage.
- YouTube for public episodes and premiere playback.

## Development status
This repository is undergoing an intentional fresh rebuild. The current `main` branch is the source of truth; legacy public pages are not being restored wholesale.

### Phase 1 — Network foundation
- [x] Establish new rebuild branch
- [x] Define network information architecture
- [x] Create network-first homepage shell
- [x] Establish visual system and accessible navigation
- [ ] Add dedicated public section pages
- [ ] Connect verified Supabase public data
- [ ] Add browser smoke tests

### Phase 1.1 — Integration verification
- [ ] Confirm project URL and browser-safe Supabase anon key through deployment configuration
- [ ] Map existing Tacoma Nights tables and policies before using them
- [ ] Verify contributor upload isolation with separate test accounts
- [ ] Verify producer review and assignment workflows
- [ ] Verify YouTube API-backed subscriber count and milestone progression

## Local preview
Open `index.html` directly for the static shell, or serve this directory with any static web server.

## Configuration
Copy `assets/js/config.example.js` to `assets/js/config.js` and add only browser-safe public configuration. Never put a Supabase service-role key, YouTube private API credential, or other secret in GitHub Pages assets.

For production, prefer GitHub Actions deployment configuration and Supabase Edge Functions for privileged API operations.

## Image credits
The initial Tacoma nightscape uses a Wikimedia Commons photograph:
- “Tacoma downtown at night.jpg” by pfly, CC BY-SA 2.0. Credit and license information: https://commons.wikimedia.org/wiki/File:Tacoma_downtown_at_night.jpg

The Tacoma skyline / waterfront card uses:
- “Tacoma skyline from Thea Foss Waterway.jpg” by Sundodger, released into the public domain by its creator. https://commons.wikimedia.org/wiki/File:Tacoma_skyline_from_Thea_Foss_Waterway.jpg

Review source-page licensing and attribution requirements before replacing, cropping or redistributing imagery.
