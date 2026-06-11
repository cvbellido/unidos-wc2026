# Unidos World Cup 2026 Bracket Challenge — Project Brief

## Overview

A branded web application for Slalom employees to participate in a FIFA World Cup 2026 bracket prediction competition. Users register, predict group stage finishers and knockout winners, and compete on a live leaderboard.

## Purpose

Build team engagement and camaraderie around the 2026 FIFA World Cup. Employees compete to predict tournament outcomes, with scoring rewarding accuracy across group stage and knockout rounds.

## Key Features

- **Registration**: Employee sign-up with `@slalom.com` email validation
- **Bracket Prediction**: Pick group stage finalists (1st & 2nd per group) and all knockout round winners through the final
- **Live Leaderboard**: Real-time scoring and ranking of all players
- **Share Codes**: Base64-encoded predictions for sharing and commissioner management
- **Admin Panel**: Enter tournament results and manage players
- **Unidos Branding**: Slalom corporate colors (dark blue/lavender/lime), Raleway typography

## Scoring

| Round | Points | Total |
|---|---|---|
| Group Stage (16 teams, 2 per group) | 1 pt each | 16 pts |
| Round of 32 | 2 pts each | 64 pts |
| Round of 16 | 4 pts each | 32 pts |
| Quarterfinals | 8 pts each | 32 pts |
| Semifinals | 16 pts each | 32 pts |
| Champion | 32 pts | 32 pts |
| **Maximum Score** | — | **184 pts** |

## Technology Stack

- **Frontend**: Pure HTML/CSS/JavaScript (no frameworks)
- **Storage**: Browser `localStorage` + Vercel Postgres
- **Backend**: Edge Functions (Vercel Edge + Node.js)
- **Build**: No build step — runs as static files
- **Deployment**: Vercel

## Project Structure

```
├── index.html              # Registration page
├── home.html               # Main bracket app
├── app.html                # Alternative app view
├── middleware.js           # Authentication middleware
├── package.json            # Dependencies (Vercel Edge & Postgres)
├── api/                    # Backend endpoints
│   ├── auth/               # Authentication routes
│   ├── _db.js              # Database utilities
│   ├── me.js               # User profile
│   ├── leaderboard.js      # Rankings & scores
│   ├── submit-picks.js     # Save predictions
│   ├── results.js          # Tournament results
│   ├── remove-player.js    # Admin: remove users
│   └── sync-results.js     # Admin: sync results from API
├── assets/                 # SVG logos & branding
└── vercel.json             # Deployment config
```

## Development Notes

- **No build step** — HTML/CSS/JS run directly
- **Data persistence** — Predictions stored in localStorage on client; results/leaderboard in Postgres
- **Share mechanism** — Predictions encoded as base64 for easy sharing
- **Responsive design** — Supports mobile and desktop views

## Deployment

Hosted on Vercel with serverless functions for backend API routes.

---

**Scope**: Internal Slalom project — employees only  
**Tournament Dates**: FIFA World Cup 2026 (TBD)  
**Last Updated**: June 2026
