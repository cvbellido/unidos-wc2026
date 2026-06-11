# Unidos World Cup 2026 Bracket Challenge

A branded bracket prediction web app for Slalom employees to compete during the FIFA World Cup 2026.

## Table of Contents

- [What It Is](#what-it-is)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Scoring System](#scoring-system)
- [API Endpoints](#api-endpoints)
- [Tech Stack](#tech-stack)
- [Deployment](#deployment)
- [Admin Guide](#admin-guide)
- [Development](#development)

## What It Is

The **Unidos World Cup 2026 Bracket Challenge** is an internal Slalom web application that lets employees:

1. **Register** with their `@slalom.com` email
2. **Predict** group stage finishers and knockout round winners
3. **Compete** on a live leaderboard
4. **Share** their picks via encoded base64 codes for commissioner-managed competitions

The app features the Unidos brand identity with dark blue, lavender, and lime colors, plus Raleway typography.

## Features

✅ **Full 2026 Tournament Bracket**
- All 48 teams across 12 groups
- Group stage predictions (pick 1st & 2nd finishers per group)
- Complete knockout bracket (R32 → R16 → QF → SF → Final)

✅ **Real-Time Leaderboard**
- Live score tracking and player rankings
- Updated as results are submitted

✅ **Share & Export**
- Generate shareable base64 codes for your picks
- Import codes from others
- Useful for commissioner-managed competition pools

✅ **Admin Panel**
- Enter tournament results
- Manage player accounts
- Sync results from external APIs

✅ **Responsive Design**
- Works on mobile, tablet, and desktop
- No plugins or dependencies required

## Getting Started

### Prerequisites

- Node.js (for local API development)
- A modern web browser
- Vercel account (for deployment)

### Local Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd "Unidos World Cup Bracket Challenge"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start a local server**
   ```bash
   # Simple HTTP server (for static files)
   npx http-server
   ```
   Then open `http://localhost:8080` in your browser.

4. **For API development**
   - Set up a `.env.local` file with `POSTGRES_URLCONNECTIONSTRING` for database access
   - Test API routes by running the Vercel dev server: `vercel dev`

## Usage

### For Players

1. **Register**: Visit the app and sign up with your `@slalom.com` email
2. **Make Picks**: 
   - Select 1st & 2nd place finisher for each of the 12 groups (16 total picks)
   - Select winners for all knockout rounds (32 total picks)
   - 48 predictions in total
3. **Track Score**: View the live leaderboard to see your ranking and points
4. **Share Your Picks**: Generate a code to share with friends or import others' picks

### For Commissioners

1. **Export Picks**: Use share codes to manage competition pools
2. **Enter Results**: Use the admin panel to record actual tournament results
3. **View Leaderboard**: Monitor real-time scores and rankings

## Scoring System

Points are awarded for correct predictions:

| Round | Points per Correct Prediction | Total Points Available |
|---|---|---|
| Group Stage (1st & 2nd per group) | 1 pt | 16 pts |
| Round of 32 | 2 pts | 64 pts |
| Round of 16 | 4 pts | 32 pts |
| Quarterfinals | 8 pts | 32 pts |
| Semifinals | 16 pts | 32 pts |
| Champion | 32 pts | 32 pts |
| **Maximum Score** | — | **184 pts** |

Accuracy is rewarded across all rounds, with knockout rounds worth exponentially more points.

## API Endpoints

### Authentication

- `POST /api/auth/register` — Create new account
- `POST /api/auth/login` — Authenticate player
- `GET /api/auth/logout` — End session

### Player Routes

- `GET /api/me` — Get current user profile
- `POST /api/submit-picks` — Save predictions
- `GET /api/leaderboard` — Get live rankings & scores

### Admin Routes

- `GET /api/results` — View tournament results
- `POST /api/results` — Enter/update results
- `DELETE /api/remove-player` — Remove player account
- `POST /api/sync-results` — Sync results from external API

### Data

- `GET /home.html` — Main bracket app
- `GET /index.html` — Registration page

## Tech Stack

**Frontend**
- Pure HTML5, CSS3, JavaScript (ES6+)
- No frameworks or build tools
- localStorage for client-side state

**Backend**
- Vercel Edge Functions (Node.js runtime)
- Vercel Postgres (database)
- @vercel/postgres SDK for queries

**Infrastructure**
- Vercel deployment
- GitHub for version control
- No separate build step

## Deployment

### Deploy to Vercel

1. **Connect repo to Vercel**
   ```bash
   vercel link
   ```

2. **Set environment variables**
   ```bash
   vercel env add POSTGRES_URLCONNECTIONSTRING
   ```
   (Paste your Vercel Postgres connection string)

3. **Deploy**
   ```bash
   vercel deploy --prod
   ```

The app will be live at your Vercel domain. Static files (HTML/CSS/JS) serve instantly; API routes run as serverless functions.

### Environment Variables

```env
POSTGRES_URLCONNECTIONSTRING=your_vercel_postgres_url
```

## Admin Guide

### Entering Tournament Results

1. Log in with admin credentials
2. Navigate to the **Admin Panel**
3. **Group Stage Results**: Enter 1st & 2nd place finishers for each group
4. **Knockout Results**: Enter winners for each round
5. **Sync**: Click "Sync & Update Scores" to recalculate leaderboard

### Managing Players

- **View Players**: See all registered accounts
- **Remove Player**: Delete a player account (irreversible)
- **Export Data**: Download scores and picks in CSV format

## Development

### Project Structure

```
.
├── index.html              # Registration/login page
├── home.html               # Bracket prediction app
├── app.html                # Alternative app layout
├── middleware.js           # Auth middleware (Vercel Edge)
├── data.json               # Static team/group data
├── api/
│   ├── auth/
│   │   ├── register.js     # New account creation
│   │   └── login.js        # Authentication
│   ├── _db.js              # Database connection & queries
│   ├── me.js               # Current user profile
│   ├── leaderboard.js      # Rankings & scores
│   ├── submit-picks.js     # Save predictions
│   ├── results.js          # Tournament results CRUD
│   ├── remove-player.js    # Delete player
│   └── sync-results.js     # Batch update results
├── assets/                 # Logos & branding (SVG)
├── package.json
└── vercel.json             # Deployment config
```

### Local Development

1. **Start dev server**
   ```bash
   vercel dev
   ```
   This runs edge functions and static files locally.

2. **Edit files**: Changes reflect immediately (hot reload)

3. **Test API routes**: Use curl or Postman
   ```bash
   curl http://localhost:3000/api/leaderboard
   ```

### No Build Step

Files are served as-is. HTML/CSS/JavaScript run directly in the browser. This keeps the project lightweight and fast.

### Database Schema

**Players table**
```sql
id, email, username, score, created_at
```

**Picks table**
```sql
id, player_id, group_picks (JSON), knockout_picks (JSON), created_at
```

**Results table**
```sql
id, round, team1_id, team2_id, winner_id, date
```

## For Slalom Employees Only

This project is internal to Slalom and intended for use by Slalom employees only. Access requires a valid `@slalom.com` email address.

---

**Latest Update**: June 2026  
**FIFA World Cup 2026**: June–July 2026  
**Questions?** Contact the project maintainers.
