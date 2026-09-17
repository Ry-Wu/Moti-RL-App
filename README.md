# Moti

A small, local-first todo and behavior reinforcement dashboard.

## Run it

Open `index.html` directly, or start a tiny local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Embed in Notion

Use the published URL with `?embed=1` in a Notion `/embed` block. The embed flag
removes the outer navigation and tightens spacing for Notion's canvas. Scores and
tasks remain private to the browser where the embed is used and persist for the
current calendar day.

## How scoring works

- Starting a work session awards a random **+1 to +50** points.
- Any open todo can start a session directly using the task as its intention.
- Ending that session awards another random **+1 to +50** points.
- Logging a detour applies a random **−1 to −100** point adjustment.
- Individual score records can be deleted; the running total recalculates instantly.
- Tasks, sessions, and scores are saved in browser `localStorage` for one calendar day.
- At local midnight, the dashboard automatically clears and starts a fresh day.
