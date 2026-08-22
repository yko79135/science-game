export interface TutorialStep {
  title: string;
  text: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome',
    text: 'A wound has let bacteria into the Skin. You are playing Bacteria against an AI Immune System. Let\'s learn the basics by actually playing.',
  },
  {
    title: 'The Hex Map',
    text: 'The body is tiled with hundreds of small hexes, grouped into organs by color. Hexes only connect to their physical neighbors — spread is constrained by the map, just like real infection routes, and can even cross from one organ into a neighboring one.',
  },
  {
    title: 'Select a Tile',
    text: 'Click the skin-icon tile on an arm — that\'s your starting colony (shown by its icon and colony-strength number).',
  },
  {
    title: 'Spend Action Points',
    text: 'You have 3 Action Points (AP) this turn. In the side panel, click "Reproduce" — it costs 1 AP and some Biomass, and grows your colony on that tile. No dice roll needed: reproduction outside a host cell is bacteria\'s reliable strength.',
  },
  {
    title: 'Spreading Is Risky',
    text: 'Now try "Spread" and click a highlighted neighboring tile. Spreading into new territory uses a dice roll — the body\'s defenses there can stop you.',
  },
  {
    title: 'Watch Your Defenses',
    text: 'If a tile gets more valuable, use "Form Biofilm" to protect it — biofilm makes immune attacks much less likely to succeed there.',
  },
  {
    title: 'End Your Turn',
    text: 'When you\'re out of good moves, click "End Turn". The Immune AI will respond, and the Body Phase will process healing, detection, and resource generation automatically.',
  },
  {
    title: 'Watch the Immune System Learn',
    text: 'Every round, the immune system slowly builds "detection" of your colonies. Once it\'s high enough, Adaptive Immunity unlocks — and the fight gets much harder. Survive, grow, and manage risk versus reward.',
  },
  {
    title: 'You\'re Ready',
    text: 'That\'s the core loop: spend AP on actions, manage resources, weigh risk against reward, and watch the body react — one hex at a time. Exit whenever you like and start a real game.',
  },
];
