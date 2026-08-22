import type { RegionId } from './types';

// Flat-top axial hex grid, generated once at module load. Coordinates share
// the same 0-100 (x) / 0-140 (y) space as the body silhouette artwork.

export type HexId = string; // "q,r"

export interface HexTileDef {
  id: HexId;
  q: number;
  r: number;
  x: number;
  y: number;
  regionId: RegionId;
  isCapital: boolean;
}

export const HEX_SIZE = 3.4;

export function hexId(q: number, r: number): HexId {
  return `${q},${r}`;
}

export function axialToPixel(q: number, r: number): { x: number; y: number } {
  return {
    x: 50 + HEX_SIZE * 1.5 * q,
    y: 3 + HEX_SIZE * Math.sqrt(3) * (r + q / 2),
  };
}

const NEI_DIRS: [number, number][] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export function hexCorners(cx: number, cy: number, size: number = HEX_SIZE): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    pts.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
  }
  return pts;
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

function inHead(x: number, y: number): boolean {
  return dist2(x, y, 50, 6) <= 7.5 * 7.5;
}

function inTorso(x: number, y: number): boolean {
  if (y < 10 || y > 84) return false;
  let xL: number;
  let xR: number;
  if (y < 26) {
    const t = (y - 10) / 16;
    xL = 38 - 13 * t;
    xR = 62 + 13 * t;
  } else {
    xL = 24;
    xR = 76;
  }
  return x >= xL && x <= xR;
}

function inArms(x: number, y: number): boolean {
  if (y < 22 || y > 70) return false;
  return (x >= 12 && x <= 28) || (x >= 72 && x <= 88);
}

function inSilhouette(x: number, y: number): boolean {
  return inHead(x, y) || inTorso(x, y) || inArms(x, y);
}

interface Seed {
  region: RegionId;
  x: number;
  y: number;
  weight: number;
}

const SEEDS: Seed[] = [
  { region: 'brain', x: 50, y: 6, weight: 1 },
  { region: 'nose', x: 50, y: 17, weight: 1 },
  { region: 'throat', x: 50, y: 27, weight: 1 },
  { region: 'lungs', x: 50, y: 42, weight: 3 },
  { region: 'heart', x: 37, y: 46, weight: 1 },
  { region: 'bloodstream', x: 50, y: 56, weight: 3 },
  { region: 'liver', x: 65, y: 60, weight: 2 },
  { region: 'spleen', x: 69, y: 48, weight: 1 },
  { region: 'lymphNodes', x: 29, y: 58, weight: 1 },
  { region: 'stomach', x: 37, y: 66, weight: 1 },
  { region: 'intestines', x: 46, y: 78, weight: 2 },
  { region: 'kidneys', x: 63, y: 78, weight: 1 },
  { region: 'skin', x: 20, y: 45, weight: 2 },
  { region: 'skin', x: 80, y: 45, weight: 2 },
];

const Q_RANGE: [number, number] = [-8, 8];
const R_RANGE: [number, number] = [-2, 16];

function generateHexTiles(): HexTileDef[] {
  const inside = new Set<HexId>();
  const coordOf = new Map<HexId, { q: number; r: number; x: number; y: number }>();
  for (let q = Q_RANGE[0]; q <= Q_RANGE[1]; q++) {
    for (let r = R_RANGE[0]; r <= R_RANGE[1]; r++) {
      const { x, y } = axialToPixel(q, r);
      if (inSilhouette(x, y)) {
        const k = hexId(q, r);
        inside.add(k);
        coordOf.set(k, { q, r, x, y });
      }
    }
  }

  const claimed = new Map<HexId, RegionId>();
  const capitals = new Set<HexId>();
  const queues = new Map<RegionId, HexId[]>();
  const credit = new Map<RegionId, number>();
  const weight = new Map<RegionId, number>();

  for (const seed of SEEDS) {
    let best: HexId | null = null;
    let bestD = Infinity;
    for (const k of inside) {
      if (claimed.has(k)) continue;
      const c = coordOf.get(k)!;
      const d = dist2(c.x, c.y, seed.x, seed.y);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    if (!best) continue;
    claimed.set(best, seed.region);
    capitals.add(best);
    if (!queues.has(seed.region)) queues.set(seed.region, []);
    queues.get(seed.region)!.push(best);
    weight.set(seed.region, (weight.get(seed.region) ?? 0) + seed.weight);
    if (!credit.has(seed.region)) credit.set(seed.region, 0);
  }

  let remaining = inside.size - claimed.size;
  let guard = 0;
  while (remaining > 0 && guard < 5000) {
    guard++;
    let progressed = false;
    for (const region of queues.keys()) {
      credit.set(region, (credit.get(region) ?? 0) + (weight.get(region) ?? 1));
      while ((credit.get(region) ?? 0) >= 1) {
        const q = queues.get(region)!;
        if (q.length === 0) {
          credit.set(region, 0);
          break;
        }
        credit.set(region, credit.get(region)! - 1);
        const cur = q.shift()!;
        const c = coordOf.get(cur)!;
        for (const [dq, dr] of NEI_DIRS) {
          const nk = hexId(c.q + dq, c.r + dr);
          if (inside.has(nk) && !claimed.has(nk)) {
            claimed.set(nk, region);
            q.push(nk);
            remaining--;
            progressed = true;
          }
        }
      }
    }
    if (!progressed) break;
  }

  for (let pass = 0; pass < 5; pass++) {
    let changed = false;
    for (const k of inside) {
      if (claimed.has(k)) continue;
      const c = coordOf.get(k)!;
      for (const [dq, dr] of NEI_DIRS) {
        const nk = hexId(c.q + dq, c.r + dr);
        if (claimed.has(nk)) {
          claimed.set(k, claimed.get(nk)!);
          changed = true;
          break;
        }
      }
    }
    if (!changed) break;
  }

  const tiles: HexTileDef[] = [];
  for (const [k, region] of claimed) {
    const c = coordOf.get(k)!;
    tiles.push({ id: k, q: c.q, r: c.r, x: c.x, y: c.y, regionId: region, isCapital: capitals.has(k) });
  }
  tiles.sort((a, b) => (a.q === b.q ? a.r - b.r : a.q - b.q));
  return tiles;
}

export const HEX_TILES: HexTileDef[] = generateHexTiles();
export const HEX_TILES_BY_ID: Record<HexId, HexTileDef> = Object.fromEntries(HEX_TILES.map((t) => [t.id, t]));

export const HEX_NEIGHBORS: Record<HexId, HexId[]> = (() => {
  const set = new Set(HEX_TILES.map((t) => t.id));
  const result: Record<HexId, HexId[]> = {};
  for (const t of HEX_TILES) {
    const list: HexId[] = [];
    for (const [dq, dr] of NEI_DIRS) {
      const nk = hexId(t.q + dq, t.r + dr);
      if (set.has(nk)) list.push(nk);
    }
    result[t.id] = list;
  }
  return result;
})();

export const HEXES_BY_REGION: Record<RegionId, HexId[]> = (() => {
  const result = {} as Record<RegionId, HexId[]>;
  for (const t of HEX_TILES) {
    if (!result[t.regionId]) result[t.regionId] = [];
    result[t.regionId].push(t.id);
  }
  return result;
})();

export function neighborsOf(id: HexId): HexId[] {
  return HEX_NEIGHBORS[id] ?? [];
}

export function capitalHexesOf(regionId: RegionId): HexId[] {
  return HEX_TILES.filter((t) => t.regionId === regionId && t.isCapital).map((t) => t.id);
}
