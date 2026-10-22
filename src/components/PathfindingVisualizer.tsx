import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Shuffle, Sparkles, Navigation, Layers, Clock, CheckCircle } from 'lucide-react';
import { soundSynth } from '../utils/audio.ts';
import { PathAlgorithm } from '../types.ts';

const ROWS = 22;
const COLS = 42;

interface NodeState {
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
  previousNode: NodeState | null;
}

export const PathfindingVisualizer: React.FC = () => {
  const [grid, setGrid] = useState<NodeState[][]>([]);
  const [algorithm, setAlgorithm] = useState<PathAlgorithm>('astar');
  const [isVisualizing, setIsVisualizing] = useState<boolean>(false);
  const [isMousePressed, setIsMousePressed] = useState<boolean>(false);
  const [drawMode, setDrawMode] = useState<'wall' | 'weight' | 'erase'>('wall');
  const [draggedNodeType, setDraggedNodeType] = useState<'start' | 'target' | null>(null);

  const [startPos, setStartPos] = useState<{ row: number; col: number }>({ row: 11, col: 6 });
  const [targetPos, setTargetPos] = useState<{ row: number; col: number }>({ row: 11, col: 35 });

  // Execution statistics
  const [visitedCount, setVisitedCount] = useState<number>(0);
  const [pathLength, setPathLength] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [execTimeMs, setExecTimeMs] = useState<number>(0);
  const [hasCompleted, setHasCompleted] = useState<boolean>(false);

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Clear all pending animation timeouts
  const clearTimeouts = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  };

  // Create initial grid
  const createInitialGrid = useCallback(
    (start = startPos, target = targetPos, keepWalls = false, currentGrid?: NodeState[][]) => {
      const newGrid: NodeState[][] = [];
      for (let r = 0; r < ROWS; r++) {
        const row: NodeState[] = [];
        for (let c = 0; c < COLS; c++) {
          const isWall = keepWalls && currentGrid ? currentGrid[r][c].isWall : false;
          const isWeight = keepWalls && currentGrid ? currentGrid[r][c].isWeight : false;

          row.push({
            row: r,
            col: c,
            isStart: r === start.row && c === start.col,
            isTarget: r === target.row && c === target.col,
            isWall,
            isWeight,
            isVisited: false,
            isPath: false,
            distance: Infinity,
            heuristic: Infinity,
            totalDistance: Infinity,
            previousNode: null,
          });
        }
        newGrid.push(row);
      }
      return newGrid;
    },
    [startPos, targetPos]
  );

  useEffect(() => {
    setGrid(createInitialGrid());
    return () => clearTimeouts();
  }, [createInitialGrid]);

  // Reset grid visualization (keep walls and weights)
  const resetVisualization = () => {
    clearTimeouts();
    setIsVisualizing(false);
    setHasCompleted(false);
    setVisitedCount(0);
    setPathLength(0);
    setTotalCost(0);
    setExecTimeMs(0);

    setGrid((prev) => {
      return prev.map((row) =>
        row.map((node) => ({
          ...node,
          isVisited: false,
          isPath: false,
          distance: Infinity,
          heuristic: Infinity,
          totalDistance: Infinity,
          previousNode: null,
        }))
      );
    });
  };

  // Full reset (clear walls too)
  const clearBoard = () => {
    clearTimeouts();
    setIsVisualizing(false);
    setHasCompleted(false);
    setVisitedCount(0);
    setPathLength(0);
    setTotalCost(0);
    setExecTimeMs(0);
    setGrid(createInitialGrid(startPos, targetPos, false));
  };

  // Recursive Backtracker Maze Generator
  const generateMaze = () => {
    clearBoard();
    soundSynth.playClick();

    // Start with all walls
    const newGrid: NodeState[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: NodeState[] = [];
      for (let c = 0; c < COLS; c++) {
        const isStart = r === startPos.row && c === startPos.col;
        const isTarget = r === targetPos.row && c === targetPos.col;
        row.push({
          row: r,
          col: c,
          isStart,
          isTarget,
          isWall: !(isStart || isTarget),
          isWeight: false,
          isVisited: false,
          isPath: false,
          distance: Infinity,
          heuristic: Infinity,
          totalDistance: Infinity,
          previousNode: null,
        });
      }
      newGrid.push(row);
    }

    // Carve passages using recursive backtracking
    const visitedCells: boolean[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const stack: [number, number][] = [];

    const startR = 1;
    const startC = 1;
    visitedCells[startR][startC] = true;
    newGrid[startR][startC].isWall = false;
    stack.push([startR, startC]);

    while (stack.length > 0) {
      const [cr, cc] = stack[stack.length - 1];
      const neighbors: [number, number, number, number][] = [];

      const dirs = [
        [-2, 0, -1, 0], // Up
        [2, 0, 1, 0],   // Down
        [0, -2, 0, -1], // Left
        [0, 2, 0, 1],   // Right
      ];

      for (const [dr, dc, wr, wc] of dirs) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && !visitedCells[nr][nc]) {
          neighbors.push([nr, nc, cr + wr, cc + wc]);
        }
      }

      if (neighbors.length > 0) {
        const [nextR, nextC, wallR, wallC] = neighbors[Math.floor(Math.random() * neighbors.length)];
        visitedCells[nextR][nextC] = true;
        newGrid[nextR][nextC].isWall = false;
        newGrid[wallR][wallC].isWall = false;
        stack.push([nextR, nextC]);
      } else {
        stack.pop();
      }
    }

    // Ensure clear start and target paths
    newGrid[startPos.row][startPos.col].isWall = false;
    newGrid[targetPos.row][targetPos.col].isWall = false;
    if (startPos.col + 1 < COLS) newGrid[startPos.row][startPos.col + 1].isWall = false;
    if (targetPos.col - 1 >= 0) newGrid[targetPos.row][targetPos.col - 1].isWall = false;

    setGrid(newGrid);
  };

  // Node Click and Drag Handling
  const handleNodeMouseDown = (r: number, c: number) => {
    if (isVisualizing) return;
    setIsMousePressed(true);

    if (r === startPos.row && c === startPos.col) {
      setDraggedNodeType('start');
      return;
    }
    if (r === targetPos.row && c === targetPos.col) {
      setDraggedNodeType('target');
      return;
    }

    toggleNode(r, c);
  };

  const handleNodeMouseEnter = (r: number, c: number) => {
    if (!isMousePressed || isVisualizing) return;

    if (draggedNodeType === 'start') {
      if (grid[r][c].isTarget) return;
      setStartPos({ row: r, col: c });
      setGrid((prev) =>
        prev.map((row) =>
          row.map((node) => ({
            ...node,
            isStart: node.row === r && node.col === c,
          }))
        )
      );
      return;
    }

    if (draggedNodeType === 'target') {
      if (grid[r][c].isStart) return;
      setTargetPos({ row: r, col: c });
      setGrid((prev) =>
        prev.map((row) =>
          row.map((node) => ({
            ...node,
            isTarget: node.row === r && node.col === c,
          }))
        )
      );
      return;
    }

    toggleNode(r, c);
  };

  const handleMouseUp = () => {
    setIsMousePressed(false);
    setDraggedNodeType(null);
  };

  const toggleNode = (r: number, c: number) => {
    if ((r === startPos.row && c === startPos.col) || (r === targetPos.row && c === targetPos.col)) {
      return;
    }

    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      const current = next[r][c];

      if (drawMode === 'wall') {
        current.isWall = !current.isWall;
        current.isWeight = false;
      } else if (drawMode === 'weight') {
        current.isWeight = !current.isWeight;
        current.isWall = false;
      } else if (drawMode === 'erase') {
        current.isWall = false;
        current.isWeight = false;
      }

      return next;
    });
  };

  // Pathfinding Execution Engine
  const runPathfinding = () => {
    if (isVisualizing) return;
    resetVisualization();
    setIsVisualizing(true);
    soundSynth.playClick();

    const startTime = performance.now();

    // Prepare fresh cloned nodes
    const nodes: NodeState[][] = grid.map((row) =>
      row.map((n) => ({
        ...n,
        distance: Infinity,
        heuristic: Infinity,
        totalDistance: Infinity,
        isVisited: false,
        isPath: false,
        previousNode: null,
      }))
    );

    const startNode = nodes[startPos.row][startPos.col];
    const targetNode = nodes[targetPos.row][targetPos.col];

    startNode.distance = 0;
    startNode.heuristic = Math.abs(startPos.row - targetPos.row) + Math.abs(startPos.col - targetPos.col);
    startNode.totalDistance = startNode.heuristic;

    const visitedNodesInOrder: NodeState[] = [];
    const openSet: NodeState[] = [startNode];
    let found = false;

    while (openSet.length > 0) {
      // Sort openSet by priority depending on algorithm
      if (algorithm === 'astar') {
        openSet.sort((a, b) => a.totalDistance - b.totalDistance || a.heuristic - b.heuristic);
      } else if (algorithm === 'dijkstra') {
        openSet.sort((a, b) => a.distance - b.distance);
      } else if (algorithm === 'dfs') {
        // LIFO for depth-first
      } else {
        // BFS is FIFO, no sort needed
      }

      const current = algorithm === 'dfs' ? openSet.pop()! : openSet.shift()!;

      if (current.isWall) continue;
      if (current.isVisited) continue;

      current.isVisited = true;
      visitedNodesInOrder.push(current);

      if (current.row === targetNode.row && current.col === targetNode.col) {
        found = true;
        break;
      }

      // Check 4 cardinal neighbors
      const neighbors: NodeState[] = [];
      const deltas = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];

      for (const [dr, dc] of deltas) {
        const nr = current.row + dr;
        const nc = current.col + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          neighbors.push(nodes[nr][nc]);
        }
      }

      for (const neighbor of neighbors) {
        if (neighbor.isWall || neighbor.isVisited) continue;

        const weight = neighbor.isWeight ? 5 : 1;
        const tentativeDistance = current.distance + weight;

        if (tentativeDistance < neighbor.distance) {
          neighbor.previousNode = current;
          neighbor.distance = tentativeDistance;
          neighbor.heuristic =
            Math.abs(neighbor.row - targetNode.row) + Math.abs(neighbor.col - targetNode.col);
          neighbor.totalDistance = neighbor.distance + neighbor.heuristic;

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    const calcTime = Math.round((performance.now() - startTime) * 100) / 100;
    setExecTimeMs(calcTime);

    // Reconstruct shortest path
    const shortestPath: NodeState[] = [];
    if (found) {
      let curr: NodeState | null = targetNode;
      let pathCostSum = 0;
      while (curr !== null) {
        shortestPath.unshift(curr);
        pathCostSum += curr.isWeight ? 5 : 1;
        curr = curr.previousNode;
      }
      setTotalCost(pathCostSum);
      setPathLength(shortestPath.length);
    } else {
      setTotalCost(0);
      setPathLength(0);
    }

    // Step-by-step animation with audio feedback
    const visitDelay = 12;
    visitedNodesInOrder.forEach((node, i) => {
      const t = setTimeout(() => {
        setGrid((prev) => {
          const next = prev.map((r) => [...r]);
          if (!next[node.row][node.col].isStart && !next[node.row][node.col].isTarget) {
            next[node.row][node.col].isVisited = true;
          }
          return next;
        });

        if (i % 8 === 0) {
          soundSynth.playTone(node.distance / (ROWS * COLS), 0.03, 'sine');
        }

        setVisitedCount(i + 1);

        // When all visited nodes are animated, animate shortest path
        if (i === visitedNodesInOrder.length - 1) {
          if (found) {
            shortestPath.forEach((pNode, pIdx) => {
              const pt = setTimeout(() => {
                setGrid((prev) => {
                  const next = prev.map((r) => [...r]);
                  if (!next[pNode.row][pNode.col].isStart && !next[pNode.row][pNode.col].isTarget) {
                    next[pNode.row][pNode.col].isPath = true;
                  }
                  return next;
                });

                if (pIdx === shortestPath.length - 1) {
                  setIsVisualizing(false);
                  setHasCompleted(true);
                  soundSynth.playSuccess();
                }
              }, pIdx * 25);
              timeoutsRef.current.push(pt);
            });
          } else {
            setIsVisualizing(false);
            setHasCompleted(true);
          }
        }
      }, i * visitDelay);

      timeoutsRef.current.push(t);
    });
  };

  return (
    <div className="space-y-6" onMouseUp={handleMouseUp}>
      {/* Header and Telemetry */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              02. Algorithmic Graph Traversal & Maze Synthesis
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Comparative graph search benchmarks implementing A* (heuristic distance minimization),
              Dijkstra (weighted cost path), BFS, and DFS alongside procedural recursive maze generation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runPathfinding}
              disabled={isVisualizing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Visualize {algorithm.toUpperCase()}</span>
            </button>

            <button
              onClick={generateMaze}
              disabled={isVisualizing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Generate Maze</span>
            </button>

            <button
              onClick={clearBoard}
              disabled={isVisualizing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-5">
          <div>
            <div className="text-xs text-slate-500 font-medium">Nodes Explored</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {visitedCount} <span className="text-xs font-normal text-slate-500">/ {ROWS * COLS}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Exploration state volume</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Optimal Path Length</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600 mt-0.5">
              {pathLength > 0 ? `${pathLength} steps` : '—'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Manhattan step sequence</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Total Accumulated Cost</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {totalCost > 0 ? `${totalCost} units` : '—'}
            </div>
            <div className="text-xs text-slate-500 mt-1">Weights included (Mud = 5)</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Compute Duration</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {execTimeMs} <span className="text-xs font-normal text-slate-500">ms</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Graph exploration time</div>
          </div>
        </div>
      </div>

      {/* Toolbar & Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        {/* Interactive Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Algorithm:</span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[
                { id: 'astar', label: 'A* Heuristic' },
                { id: 'dijkstra', label: 'Dijkstra' },
                { id: 'bfs', label: 'BFS (Breadth)' },
                { id: 'dfs', label: 'DFS (Depth)' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    soundSynth.playClick();
                    setAlgorithm(item.id as PathAlgorithm);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    algorithm === item.id
                      ? 'bg-white text-slate-950 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Brush Mode:</span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setDrawMode('wall')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  drawMode === 'wall' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Wall Barrier
              </button>
              <button
                onClick={() => setDrawMode('weight')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  drawMode === 'weight' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Swamp Mud (Cost: 5)
              </button>
              <button
                onClick={() => setDrawMode('erase')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  drawMode === 'erase' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Eraser
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-emerald-500 rounded-xs" />
              <span>Start</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-rose-500 rounded-xs" />
              <span>Target</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-slate-800 rounded-xs" />
              <span>Wall</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-amber-200 border border-amber-400 rounded-xs" />
              <span>Weight</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-sky-200 rounded-xs" />
              <span>Visited</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 bg-amber-400 rounded-xs" />
              <span>Path</span>
            </div>
          </div>
        </div>

        {/* 2D Interactive Grid Viewport */}
        <div className="overflow-x-auto select-none py-2 flex justify-center">
          <div
            className="grid gap-[2px] bg-slate-200 p-[2px] rounded-lg border border-slate-300 w-fit"
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            }}
          >
            {grid.map((row, r) =>
              row.map((node, c) => {
                let bg = 'bg-white';
                if (node.isStart) bg = 'bg-emerald-500 scale-105';
                else if (node.isTarget) bg = 'bg-rose-500 scale-105';
                else if (node.isPath) bg = 'bg-amber-400 animate-pulse';
                else if (node.isWall) bg = 'bg-slate-800';
                else if (node.isWeight) bg = 'bg-amber-200 border border-amber-300';
                else if (node.isVisited) bg = 'bg-sky-200 transition-colors duration-300';

                return (
                  <div
                    key={`${r}-${c}`}
                    onMouseDown={() => handleNodeMouseDown(r, c)}
                    onMouseEnter={() => handleNodeMouseEnter(r, c)}
                    className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center text-[10px] font-bold rounded-[2px] cursor-pointer transition-transform ${bg}`}
                  >
                    {node.isStart && <Navigation className="w-2.5 h-2.5 text-white" />}
                    {node.isTarget && <span className="text-white text-[9px]">★</span>}
                    {node.isWeight && !node.isPath && (
                      <span className="text-amber-800 text-[8px] font-mono">5</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="text-xs text-slate-500 text-center pt-1">
          Tip: Click & drag the Start (green) or Target (red) pins anywhere. Click and drag on empty cells to draw walls or swamp tiles.
        </div>
      </div>
    </div>
  );
};
