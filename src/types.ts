export type ActiveTab = 'physics' | 'pathfinding' | 'sorting' | 'data-engine' | 'architecture';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  mass: number;
}

export type PathAlgorithm = 'astar' | 'dijkstra' | 'bfs' | 'dfs';

export interface GridNode {
  row: number;
  col: number;
  isStart: boolean;
  isTarget: boolean;
  isWall: boolean;
  isWeight: boolean;
  isVisited: boolean;
  isPath: boolean;
  distance: number;
  heuristic: number;
  totalDistance: number;
  previousNode: GridNode | null;
}

export type SortAlgorithm = 'quicksort' | 'mergesort' | 'heapsort' | 'shellsort' | 'bubblesort';

export interface TelemetryItem {
  id: string;
  symbol: string;
  name: string;
  category: 'Infrastructure' | 'FinTech' | 'Database' | 'ML Pipeline' | 'Edge Network';
  value: number;
  change24h: number;
  latencyMs: number;
  throughputQps: number;
  status: 'nominal' | 'warning' | 'critical';
  history: number[];
}
