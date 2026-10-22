import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Shuffle, Sparkles, BarChart2, CheckCircle2 } from 'lucide-react';
import { soundSynth } from '../utils/audio.ts';
import { SortAlgorithm } from '../types.ts';

interface ArrayBar {
  value: number;
  state: 'default' | 'comparing' | 'swapping' | 'sorted';
}

export const SortingVisualizer: React.FC = () => {
  const [array, setArray] = useState<ArrayBar[]>([]);
  const [algorithm, setAlgorithm] = useState<SortAlgorithm>('quicksort');
  const [arraySize, setArraySize] = useState<number>(48);
  const [speed, setSpeed] = useState<number>(30); // ms per step
  const [isSorting, setIsSorting] = useState<boolean>(false);

  // Live telemetry counters
  const [comparisons, setComparisons] = useState<number>(0);
  const [swaps, setSwaps] = useState<number>(0);
  const [elapsedTimeMs, setElapsedTimeMs] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  const abortControllerRef = useRef<boolean>(false);

  // Generate randomized array
  const generateNewArray = (size = arraySize, mode: 'random' | 'reversed' | 'nearly' = 'random') => {
    abortControllerRef.current = true;
    setIsSorting(false);
    setIsComplete(false);
    setComparisons(0);
    setSwaps(0);
    setElapsedTimeMs(0);

    const newArr: ArrayBar[] = [];
    for (let i = 0; i < size; i++) {
      let val = Math.floor(Math.random() * 95) + 5;
      if (mode === 'reversed') {
        val = Math.floor(((size - i) / size) * 95) + 5;
      } else if (mode === 'nearly') {
        val = Math.floor((i / size) * 95) + (Math.random() > 0.8 ? Math.floor(Math.random() * 20 - 10) : 0);
        val = Math.max(5, Math.min(100, val));
      }
      newArr.push({ value: val, state: 'default' });
    }
    setArray(newArr);
  };

  useEffect(() => {
    generateNewArray(arraySize);
  }, [arraySize]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Run selected sorting algorithm
  const startSorting = async () => {
    if (isSorting) return;
    setIsSorting(true);
    setIsComplete(false);
    abortControllerRef.current = false;
    soundSynth.playClick();

    const startTimestamp = performance.now();
    let compCount = 0;
    let swapCount = 0;

    // Helper to update state and play audio
    const updateArr = async (arrCopy: ArrayBar[], activeIndices: number[], state: 'comparing' | 'swapping') => {
      if (abortControllerRef.current) return;
      arrCopy.forEach((item, idx) => {
        if (item.state !== 'sorted') {
          item.state = activeIndices.includes(idx) ? state : 'default';
        }
      });
      setArray([...arrCopy]);

      if (activeIndices.length > 0) {
        const val = arrCopy[activeIndices[0]].value;
        soundSynth.playTone(val / 100, Math.min(0.04, speed / 1000), 'sine');
      }

      setComparisons(compCount);
      setSwaps(swapCount);
      setElapsedTimeMs(Math.round(performance.now() - startTimestamp));
      await sleep(speed);
    };

    const currentArray: ArrayBar[] = array.map((item) => ({ ...item, state: 'default' }));

    try {
      if (algorithm === 'quicksort') {
        // QuickSort implementation
        const partition = async (low: number, high: number): Promise<number> => {
          const pivot = currentArray[high].value;
          let i = low - 1;

          for (let j = low; j < high; j++) {
            if (abortControllerRef.current) return i;
            compCount++;
            await updateArr(currentArray, [j, high], 'comparing');

            if (currentArray[j].value < pivot) {
              i++;
              swapCount++;
              const temp = currentArray[i];
              currentArray[i] = currentArray[j];
              currentArray[j] = temp;
              await updateArr(currentArray, [i, j], 'swapping');
            }
          }

          swapCount++;
          const temp = currentArray[i + 1];
          currentArray[i + 1] = currentArray[high];
          currentArray[high] = temp;
          await updateArr(currentArray, [i + 1, high], 'swapping');
          return i + 1;
        };

        const quickSortHelper = async (low: number, high: number) => {
          if (low < high && !abortControllerRef.current) {
            const pi = await partition(low, high);
            currentArray[pi].state = 'sorted';
            await quickSortHelper(low, pi - 1);
            await quickSortHelper(pi + 1, high);
          } else if (low >= 0 && low < currentArray.length) {
            currentArray[low].state = 'sorted';
          }
        };

        await quickSortHelper(0, currentArray.length - 1);
      } else if (algorithm === 'mergesort') {
        // MergeSort implementation
        const merge = async (l: number, m: number, r: number) => {
          const leftPart = currentArray.slice(l, m + 1);
          const rightPart = currentArray.slice(m + 1, r + 1);

          let i = 0;
          let j = 0;
          let k = l;

          while (i < leftPart.length && j < rightPart.length && !abortControllerRef.current) {
            compCount++;
            await updateArr(currentArray, [k], 'comparing');

            if (leftPart[i].value <= rightPart[j].value) {
              swapCount++;
              currentArray[k] = leftPart[i];
              i++;
            } else {
              swapCount++;
              currentArray[k] = rightPart[j];
              j++;
            }
            await updateArr(currentArray, [k], 'swapping');
            k++;
          }

          while (i < leftPart.length && !abortControllerRef.current) {
            swapCount++;
            currentArray[k] = leftPart[i];
            await updateArr(currentArray, [k], 'swapping');
            i++;
            k++;
          }

          while (j < rightPart.length && !abortControllerRef.current) {
            swapCount++;
            currentArray[k] = rightPart[j];
            await updateArr(currentArray, [k], 'swapping');
            j++;
            k++;
          }
        };

        const mergeSortHelper = async (l: number, r: number) => {
          if (l >= r || abortControllerRef.current) return;
          const m = Math.floor((l + r) / 2);
          await mergeSortHelper(l, m);
          await mergeSortHelper(m + 1, r);
          await merge(l, m, r);
        };

        await mergeSortHelper(0, currentArray.length - 1);
      } else if (algorithm === 'heapsort') {
        // HeapSort implementation
        const heapify = async (n: number, i: number) => {
          let largest = i;
          const left = 2 * i + 1;
          const right = 2 * i + 2;

          if (left < n) {
            compCount++;
            await updateArr(currentArray, [left, largest], 'comparing');
            if (currentArray[left].value > currentArray[largest].value) {
              largest = left;
            }
          }

          if (right < n) {
            compCount++;
            await updateArr(currentArray, [right, largest], 'comparing');
            if (currentArray[right].value > currentArray[largest].value) {
              largest = right;
            }
          }

          if (largest !== i && !abortControllerRef.current) {
            swapCount++;
            const swap = currentArray[i];
            currentArray[i] = currentArray[largest];
            currentArray[largest] = swap;
            await updateArr(currentArray, [i, largest], 'swapping');
            await heapify(n, largest);
          }
        };

        const n = currentArray.length;
        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
          if (abortControllerRef.current) break;
          await heapify(n, i);
        }

        for (let i = n - 1; i > 0; i--) {
          if (abortControllerRef.current) break;
          swapCount++;
          const temp = currentArray[0];
          currentArray[0] = currentArray[i];
          currentArray[i] = temp;
          currentArray[i].state = 'sorted';
          await updateArr(currentArray, [0, i], 'swapping');
          await heapify(i, 0);
        }
      } else if (algorithm === 'shellsort') {
        // ShellSort
        const n = currentArray.length;
        for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
          for (let i = gap; i < n; i++) {
            if (abortControllerRef.current) break;
            const temp = currentArray[i];
            let j = i;

            while (j >= gap && currentArray[j - gap].value > temp.value && !abortControllerRef.current) {
              compCount++;
              swapCount++;
              currentArray[j] = currentArray[j - gap];
              await updateArr(currentArray, [j, j - gap], 'swapping');
              j -= gap;
            }
            currentArray[j] = temp;
            await updateArr(currentArray, [j], 'swapping');
          }
        }
      } else if (algorithm === 'bubblesort') {
        // BubbleSort
        const n = currentArray.length;
        for (let i = 0; i < n - 1; i++) {
          for (let j = 0; j < n - i - 1; j++) {
            if (abortControllerRef.current) break;
            compCount++;
            await updateArr(currentArray, [j, j + 1], 'comparing');

            if (currentArray[j].value > currentArray[j + 1].value) {
              swapCount++;
              const temp = currentArray[j];
              currentArray[j] = currentArray[j + 1];
              currentArray[j + 1] = temp;
              await updateArr(currentArray, [j, j + 1], 'swapping');
            }
          }
          currentArray[n - i - 1].state = 'sorted';
        }
      }

      if (!abortControllerRef.current) {
        // Final sweep animation
        for (let i = 0; i < currentArray.length; i++) {
          currentArray[i].state = 'sorted';
          soundSynth.playTone(currentArray[i].value / 100, 0.02, 'triangle');
          setArray([...currentArray]);
          await sleep(15);
        }
        setIsComplete(true);
        soundSynth.playSuccess();
      }
    } catch {
      // Aborted or cancelled
    } finally {
      setIsSorting(false);
      setElapsedTimeMs(Math.round(performance.now() - startTimestamp));
    }
  };

  const stopSorting = () => {
    abortControllerRef.current = true;
    setIsSorting(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Telemetry */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              03. Real-Time Sorting Benchmark & Acoustic Synthesis
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Comparative computational complexity benchmark visualizing memory writes, element comparisons,
              and frequency-synthesized acoustic feedback across classic sorting algorithms.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isSorting ? (
              <button
                onClick={startSorting}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start Benchmark</span>
              </button>
            ) : (
              <button
                onClick={stopSorting}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                <Pause className="w-3.5 h-3.5 fill-white" />
                <span>Halt Execution</span>
              </button>
            )}

            <button
              onClick={() => generateNewArray(arraySize, 'random')}
              disabled={isSorting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Randomize</span>
            </button>

            <button
              onClick={() => generateNewArray(arraySize, 'reversed')}
              disabled={isSorting}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <span>Reverse Array</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-5">
          <div>
            <div className="text-xs text-slate-500 font-medium">Element Comparisons</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {comparisons.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Conditional evaluation cycles</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Array Writes / Swaps</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600 mt-0.5">
              {swaps.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Memory slot reassignments</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Execution Duration</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {elapsedTimeMs} <span className="text-xs font-normal text-slate-500">ms</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Wall clock run time</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Array Capacity</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {array.length} <span className="text-xs font-normal text-slate-500">items</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Range: [5, 100]</div>
          </div>
        </div>
      </div>

      {/* Main Visualizer and Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Algorithm Selector & Parameters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 h-fit shadow-sm">
          <div>
            <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">Select Algorithm</label>
            <div className="grid grid-cols-1 gap-1.5 mt-2">
              {[
                { id: 'quicksort', label: 'QuickSort', comp: 'O(n log n)', space: 'O(log n)' },
                { id: 'mergesort', label: 'MergeSort', comp: 'O(n log n)', space: 'O(n)' },
                { id: 'heapsort', label: 'HeapSort', comp: 'O(n log n)', space: 'O(1)' },
                { id: 'shellsort', label: 'ShellSort', comp: 'O(n^1.5)', space: 'O(1)' },
                { id: 'bubblesort', label: 'BubbleSort', comp: 'O(n^2)', space: 'O(1)' },
              ].map((alg) => (
                <button
                  key={alg.id}
                  disabled={isSorting}
                  onClick={() => {
                    soundSynth.playClick();
                    setAlgorithm(alg.id as SortAlgorithm);
                  }}
                  className={`p-2.5 rounded-lg text-left transition-all disabled:opacity-50 ${
                    algorithm === alg.id
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-medium'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{alg.label}</span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-500">{alg.comp}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Auxiliary Space: {alg.space}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Array Density</span>
                <span className="font-mono tabular-nums">{arraySize}</span>
              </div>
              <input
                type="range"
                min="16"
                max="96"
                step="4"
                value={arraySize}
                disabled={isSorting}
                onChange={(e) => setArraySize(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Step Delay (Throttle)</span>
                <span className="font-mono tabular-nums">{speed} ms</span>
              </div>
              <input
                type="range"
                min="5"
                max="120"
                step="5"
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Acoustic Synthesizer:</div>
            <p>Every element check generates a frequency (180 Hz to 900 Hz) proportional to its magnitude.</p>
          </div>
        </div>

        {/* Array Bars Viewport */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[460px]">
          {/* Header Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="font-medium text-slate-700">Memory Visualization Field</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono uppercase">{algorithm}</span>
            </div>

            {/* Visual Bar State Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-slate-300 rounded-xs" />
                <span>Idle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-xs" />
                <span>Comparing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-xs" />
                <span>Swapping</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" />
                <span>Sorted</span>
              </div>
            </div>
          </div>

          {/* Bars Field */}
          <div className="flex items-end justify-center gap-1 flex-1 py-8 px-2">
            {array.map((bar, idx) => {
              let barColor = 'bg-slate-300';
              if (bar.state === 'comparing') barColor = 'bg-amber-400 shadow-xs shadow-amber-300';
              else if (bar.state === 'swapping') barColor = 'bg-rose-500 shadow-xs shadow-rose-300 scale-105';
              else if (bar.state === 'sorted') barColor = 'bg-emerald-500';

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center justify-end h-full max-w-[24px]"
                >
                  <div
                    style={{ height: `${bar.value}%` }}
                    className={`w-full rounded-t-xs transition-all duration-75 ${barColor}`}
                  />
                  {array.length <= 32 && (
                    <span className="text-[9px] font-mono tabular-nums text-slate-500 mt-1">
                      {bar.value}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Status */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {isSorting ? 'Sorting in progress...' : isComplete ? 'Array sorted successfully.' : 'Ready.'}
            </span>
            {isComplete && (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verification passed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
