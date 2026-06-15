---
name: testing-top-trumps
description: Test the Phase 1 World Conquest Top Trumps browser prototype end-to-end. Use when verifying gameplay, territory ownership, combat, cooldown, or AI turn changes.
---

# Testing Top Trumps Prototype

## Devin Secrets Needed

None. The app is a static local browser prototype and does not require login, API keys, or external credentials.

## Local Startup

- From the repo root, run `npm start` to serve the static app on port 8000.
- Open `http://127.0.0.1:8000/` in Chrome.
- If a previous server process was killed by a VM restart, start it again before browser testing.

## Useful Checks

- `npm run lint` runs JavaScript syntax checks.
- `npm test` runs Node engine tests.
- CI currently only includes GitGuardian security checks, so runtime behavior should be verified locally in Chrome.

## Browser Golden Path

Use the United States default country for a deterministic smoke flow:

1. Confirm the page header reads `World Conquest Top Trumps` and the scoreboard starts at `Player 15`, `AI 15`, `Turn 0`.
2. Confirm no Game Over overlay blocks the startup state. If the overlay appears, check the CSS `[hidden]` handling for `.end-screen`.
3. Click the blue `NYC` map node for New York City.
   - Expected: attacker card shows `New York City`, owner `PLAYER`, `ECON 1`, and the `Attack` button is enabled.
4. Click `Attack`, then click the red `SF` node for San Francisco.
   - Expected: phase changes to target/stat selection; San Francisco is AI-owned and target stats are hidden as `?`.
5. Click `ECON`.
   - Expected: battle log includes `New York City ECON 1 vs Indianapolis ECON 5. PLAYER captured San Francisco.`
6. Wait for the AI auto-turn.
   - Expected: scoreboard returns to `Player 15`, `AI 15`, `Turn 2`; log includes `Washington DC TECH 5 vs Columbus AREA 55. AI captured Columbus.`; cooldown markers are visible on used territories.

## Recording Tips

- Start screen recording after the local app is already reachable.
- Annotate startup, attacker selection, target/stat selection, and final AI counter-turn assertions.
- Capture a final full-screen screenshot showing the scoreboard, battle log, and cooldown markers.
