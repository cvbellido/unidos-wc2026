# Unidos World Cup 2026 Bracket Challenge

A branded bracket challenge web app for Slalom employees to compete during the FIFA World Cup 2026.

## What it is

- **Registration page** (`index.html`) — employees sign up with their `@slalom.com` email
- **Bracket app** (`home.html`) — pick group stage finishers and knockout round winners across all 48 teams and 12 groups

## Features

- Full 2026 group stage & knockout bracket (R32 → R16 → QF → SF → Final)
- Pick tracking with a live score leaderboard
- Share picks via a base64 code — useful for commissioner-managed leaderboards
- Admin panel for entering results and managing players
- Unidos brand design — Raleway font, dark blue/lavender/lime palette

## Scoring

| Round | Points |
|---|---|
| Group stage (1st & 2nd per group) | 1 pt each |
| Round of 32 | 2 pts each |
| Round of 16 | 4 pts each |
| Quarterfinals | 8 pts each |
| Semifinals | 16 pts each |
| Champion | 32 pts |
| **Maximum possible** | **184 pts** |

## Tech

Pure HTML/CSS/JavaScript — no frameworks, no build step. Data stored in `localStorage`.

## For Slalom employees only

This project is internal to Slalom and intended for use by Slalom employees only.
