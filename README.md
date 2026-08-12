# Infection: Battle for the Body

A browser strategy game about bacteria, viruses, and the immune system, fought out on a stylized map of the human body. Built for classroom use (roughly grades 7–12), but designed first as a strategy game — asymmetric factions, action points, dice-based resolution, upgrades, and a body that reacts to the fight — with the biology emerging from the mechanics rather than from quizzes or trivia.

## Playing

```bash
npm install
npm run dev
```

Open the printed local URL. From the main menu you can start a Quick, Standard, or Scenario game, assign each faction to a human or AI player, run the interactive tutorial, or browse the Science Codex.

## How it works

- **Factions**: Bacteria (durable colonies, steady economy, toxins, resistance), Virus (explosive but fragile, must infect host cells to reproduce), and the Immune System (weak innate defenses early, powerful adaptive immunity once it identifies the threat).
- **Map**: 13 connected body regions (skin, airway, lungs, bloodstream, major organs, lymph nodes, brain) with their own health, traits, and — for the intestines — a competing microbiome.
- **Turns**: an automatic Body Phase (healing, resource generation, detection, random events) followed by each active faction's turn (3 action points to spend), then resolution and victory checks.
- **Dice**: contested and threshold rolls with visible modifiers drive risky actions (spreading, infecting, immune attacks), while core economy actions (reproducing, replicating) are deterministic.
- **Adaptive immunity**: the immune system accumulates "detection" against each pathogen; once it crosses a threshold, antibodies and T cells unlock — creating a race between pathogen spread and immune recognition.

## Project layout

- `src/engine/` — all game logic and state: map data, per-faction actions, dice, body phase, medicine/resistance, events, victory conditions, and AI. Framework-agnostic and unit-testable.
- `src/store.ts` — a Zustand + Immer store that drives the engine, auto-plays AI/body/resolution phases, and persists to `localStorage`.
- `src/components/` — the React UI (map, HUD, action panel, dice overlay, event log, modals, tutorial).
- `src/data/` — static content: the Science Codex and tutorial script.

## Tech

React + TypeScript + Vite, Zustand for state, Immer for immutable updates. No backend — everything runs client-side with `localStorage` for save games.
