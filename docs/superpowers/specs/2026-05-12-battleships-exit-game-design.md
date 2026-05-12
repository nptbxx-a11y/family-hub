# Battleships Exit Game Design
**Date:** 2026-05-12

## Overview

Add an "Exit game" button to all active Battleships screens so either player can abandon the current game and return to the lobby. Exiting ends the game for both players.

## Behaviour

- Tapping "✕ Exit game" calls `handleExit()` in `Battleships.jsx`
- `handleExit()` updates the game row to `status: 'finished'` (no winner set) in Supabase, then sets local `game` state to `null`
- The other player's existing realtime subscription picks up the status change and their UI transitions to the finished screen
- The finished screen already has a "Play Again" button — no new navigation needed for the exiting player (their `game` is already null, so they see the lobby)

## Null-Winner Guard

The existing victory block renders `${displayName(game.winner)} wins!` which breaks when `game.winner` is null. Add a guard:

- If `game.status === 'finished'` and `!game.winner`: show "Game abandoned" message with the Play Again button
- If `game.status === 'finished'` and `game.winner` is set: existing win/loss display unchanged

## Exit Button Placement

Show the exit button on these screens (all managed in `Battleships.jsx`):

| Screen | Condition |
|--------|-----------|
| Waiting lobby — creator | `game.status === 'waiting' && game.created_by === playerKey` |
| Placement phase | `game.status === 'placing'` and player has not yet marked ready |
| Ready, waiting for opponent | `game.status === 'placing'` and player has already marked ready |
| Active battle | `game.status === 'playing'` (rendered inside `BattleshipsGame`) |

Do NOT show on: player-select screen, join lobby (you haven't committed), or victory screen.

## Exit Button in BattleshipsGame

The battle screen is rendered by `<BattleshipsGame>`. Rather than lifting the button up to `Battleships.jsx`, pass `onExit` as a prop to `BattleshipsGame` and render the button inside that component at the bottom of the page.

## Styling

Add `.bs-exit-btn` to `Battleships.css`:
- Small, muted text link appearance (no background, no border)
- Colour: `#999` (muted, doesn't compete with action buttons)
- Font size: `0.85rem`
- Margin top: `auto` or a fixed top margin to push it to the bottom of the screen
- Displayed as a block centred below the main content

## Files Changed

| File | Change |
|------|--------|
| `src/components/Battleships.jsx` | Add `handleExit()`, null-winner guard, exit button on 3 screens, pass `onExit` to `BattleshipsGame` |
| `src/components/BattleshipsGame.jsx` | Accept `onExit` prop, render exit button at bottom |
| `src/components/Battleships.css` | Add `.bs-exit-btn` style |
