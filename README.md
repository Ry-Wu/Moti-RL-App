# Moti

Moti is a small, local-first todo and behavior reinforcement dashboard designed
to run as a standalone website or inside a Notion embed.

## Features

Start a work session manually or directly from an open task. Anything that makes a positive impact on your life, work, health, etc. For example, 

- Receive a random **+1 to +50** score when a session starts.
- Receive another random **+1 to +50** score when it ends.
<br>

If you've done anything you think has negative impact, such as sleeping late or touching fish for too long during work,

- Log a detour for a random **−1 to −100** adjustment.

You can also: 

- Delete individual score records and recalculate the total instantly.
- Keep each browser's tasks, sessions, and scores separate without user accounts.
- Preserve the current day's data across refreshes using browser localStorage.
- The dashboard automatically clear the dashboard at local midnight.


No build command or database is required. Make future website changes directly
in these root files.

## Run locally

From the project directory, run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy with GitHub Pages

For this repository, the expected URL is:

```text
https://ry-wu.github.io/Moti-RL-App/
```

## Embed in Notion

1. Open the destination Notion page.
2. Type `/embed` and select **Embed**.
3. Paste the published website URL with `?embed=1` appended.
4. Select **Embed link** or **Create embed**.
5. Resize the block to fit the dashboard.

Example:

```text
https://ry-wu.github.io/Moti-RL-App/?embed=1
```

The `embed` parameter removes the outer navigation and tightens the layout for
Notion. Each browser or browser profile receives an independent dataset. Tabs
within the same browser profile share that browser's data.

## Storage model

Moti intentionally does not use a database. Data is stored only in the current
browser using `localStorage`, which means:

- A normal refresh or browser restart preserves the current day's records.
- Different browsers, devices, and browser profiles do not share records.
- Clearing site data or using private browsing can remove records.
- Data does not sync between devices.
- The app resets its local data at midnight.
