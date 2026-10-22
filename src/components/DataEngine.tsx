import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Search, ArrowUpDown, Filter, Activity, RefreshCw } from 'lucide-react';
import { soundSynth } from '../utils/audio.ts';
import { TelemetryItem } from '../types.ts';

const INITIAL_ITEMS: TelemetryItem[] = [
  { id: 'srv-01', symbol: 'US-EAST-DB', name: 'PostgreSQL Primary Cluster', category: 'Database', value: 4820.5, change24h: 3.42, latencyMs: 1.4, throughputQps: 18400, status: 'nominal', history: [4500, 4600, 4720, 4800, 4820.5] },
  { id: 'srv-02', symbol: 'EU-CENT-API', name: 'Vite Express Edge Node', category: 'Infrastructure', value: 924.1, change24h: -0.85, latencyMs: 2.1, throughputQps: 42100, status: 'nominal', history: [940, 935, 928, 922, 924.1] },
  { id: 'srv-03', symbol: 'US-WEST-AUTH', name: 'OAuth 2.0 Token Authority', category: 'Infrastructure', value: 215.0, change24h: 0.12, latencyMs: 0.8, throughputQps: 12500, status: 'nominal', history: [210, 212, 214, 215, 215.0] },
  { id: 'srv-04', symbol: 'AP-NORTHEAST-WS', name: 'Realtime WebSocket Mesh', category: 'Edge Network', value: 8940.0, change24h: 7.84, latencyMs: 5.6, throughputQps: 64200, status: 'warning', history: [8200, 8400, 8600, 8800, 8940.0] },
  { id: 'srv-05', symbol: 'FIREBASE-SYNC', name: 'Firestore Document Ingestion', category: 'Database', value: 1640.2, change24h: 1.15, latencyMs: 2.9, throughputQps: 28900, status: 'nominal', history: [1600, 1615, 1625, 1635, 1640.2] },
  { id: 'srv-06', symbol: 'VECTOR-INDEX', name: 'HNSW Semantic Vector Graph', category: 'ML Pipeline', value: 7420.8, change24h: -2.31, latencyMs: 14.2, throughputQps: 9800, status: 'warning', history: [7600, 7550, 7500, 7450, 7420.8] },
  { id: 'srv-07', symbol: 'SETTLEMENT-LEDGER', name: 'Double-Entry Ledger Engine', category: 'FinTech', value: 12904.5, change24h: 4.67, latencyMs: 3.2, throughputQps: 15300, status: 'nominal', history: [12200, 12400, 12650, 12800, 12904.5] },
  { id: 'srv-08', symbol: 'AUDIO-DSP', name: 'Web Audio FFT Streamer', category: 'Edge Network', value: 450.0, change24h: 0.05, latencyMs: 0.4, throughputQps: 84000, status: 'nominal', history: [445, 448, 449, 450, 450.0] },
  { id: 'srv-09', symbol: 'CDN-CACHE', name: 'Global Asset Invalidation', category: 'Infrastructure', value: 3105.7, change24h: 6.20, latencyMs: 1.1, throughputQps: 98200, status: 'nominal', history: [2900, 2950, 3020, 3080, 3105.7] },
  { id: 'srv-10', symbol: 'PAYMENT-GATEWAY', name: 'Stripe Settlement Proxy', category: 'FinTech', value: 6812.3, change24h: -4.10, latencyMs: 28.5, throughputQps: 4200, status: 'critical', history: [7100, 7050, 6980, 6900, 6812.3] },
];

export const DataEngine: React.FC = () => {
  const [data, setData] = useState<TelemetryItem[]>(INITIAL_ITEMS);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [streamRateHz, setStreamRateHz] = useState<number>(5); // updates per sec
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortField, setSortField] = useState<keyof TelemetryItem>('throughputQps');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Streaming throughput statistics
  const [totalUpdates, setTotalUpdates] = useState<number>(0);
  const updateCountRef = useRef<number>(0);

  // Background stream ticker
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setData((prev) => {
        return prev.map((item) => {
          const delta = (Math.random() - 0.48) * (item.value * 0.012);
          const nextVal = Math.max(10, Math.round((item.value + delta) * 10) / 10);
          const nextHistory = [...item.history.slice(-14), nextVal];
          const nextLatency = Math.max(0.2, Math.round((item.latencyMs + (Math.random() - 0.5) * 0.4) * 10) / 10);
          const nextQps = Math.max(100, item.throughputQps + Math.floor((Math.random() - 0.5) * 800));

          let nextStatus = item.status;
          if (nextLatency > 22) nextStatus = 'critical';
          else if (nextLatency > 8) nextStatus = 'warning';
          else nextStatus = 'nominal';

          return {
            ...item,
            value: nextVal,
            latencyMs: nextLatency,
            throughputQps: nextQps,
            status: nextStatus,
            history: nextHistory,
          };
        });
      });

      updateCountRef.current++;
      setTotalUpdates(updateCountRef.current);
    }, 1000 / streamRateHz);

    return () => clearInterval(interval);
  }, [isStreaming, streamRateHz]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return data
      .filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.symbol.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
      });
  }, [data, searchQuery, selectedCategory, sortField, sortAsc]);

  // Aggregate metrics
  const avgLatency = useMemo(() => {
    const sum = data.reduce((acc, curr) => acc + curr.latencyMs, 0);
    return (sum / data.length).toFixed(1);
  }, [data]);

  const aggregateQps = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.throughputQps, 0);
  }, [data]);

  const toggleSort = (field: keyof TelemetryItem) => {
    soundSynth.playClick();
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Sparkline renderer
  const renderSparkline = (points: number[]) => {
    if (points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 75;
    const height = 22;

    const pathData = points
      .map((val, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    const isUp = points[points.length - 1] >= points[0];

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={pathData}
          fill="none"
          stroke={isUp ? '#10b981' : '#f43f5e'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Telemetry */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              04. High-Throughput Reactive Telemetry & Stream Engine
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Simulated real-time streaming infrastructure processing live delta events, dynamic vector sparklines,
              client-side multi-key sort indexing, and fault anomaly detection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundSynth.playClick();
                setIsStreaming(!isStreaming);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isStreaming
                  ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
              }`}
            >
              {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              <span>{isStreaming ? 'Pause Stream' : 'Resume Stream'}</span>
            </button>

            <button
              onClick={() => {
                soundSynth.playClick();
                setData(INITIAL_ITEMS);
                updateCountRef.current = 0;
                setTotalUpdates(0);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Stream</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-5">
          <div>
            <div className="text-xs text-slate-500 font-medium">Aggregated Throughput</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {aggregateQps.toLocaleString()} <span className="text-xs font-normal text-slate-500">QPS</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Total stream bandwidth</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Average Fleet Latency</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {avgLatency} <span className="text-xs font-normal text-slate-500">ms</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">p50 cluster response</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Processed Delta Events</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600 mt-0.5">
              {totalUpdates.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Realtime state updates</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Stream Tick Frequency</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {streamRateHz} <span className="text-xs font-normal text-slate-500">Hz</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Reactive pump interval</div>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        {/* Controls row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by symbol or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Category Segmented Control */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {['All', 'Infrastructure', 'Database', 'FinTech', 'Edge Network'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    soundSynth.playClick();
                    setSelectedCategory(cat);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Stream speed slider */}
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-600">
              <span>Rate:</span>
              <span className="font-mono tabular-nums">{streamRateHz} Hz</span>
              <input
                type="range"
                min="1"
                max="20"
                value={streamRateHz}
                onChange={(e) => setStreamRateHz(parseInt(e.target.value))}
                className="w-20 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* High-Density Data Grid (Strictly adhering to Constitution: tabular-nums, compact rows, clean text status) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">
                  <button
                    onClick={() => toggleSort('symbol')}
                    className="flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Node / Identifier</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => toggleSort('value')}
                    className="flex items-center gap-1 ml-auto hover:text-slate-900 cursor-pointer"
                  >
                    <span>Metric Index</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Trend (15 Ticks)</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => toggleSort('latencyMs')}
                    className="flex items-center gap-1 ml-auto hover:text-slate-900 cursor-pointer"
                  >
                    <span>Latency</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    onClick={() => toggleSort('throughputQps')}
                    className="flex items-center gap-1 ml-auto hover:text-slate-900 cursor-pointer"
                  >
                    <span>Throughput</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-right">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900 font-mono text-[11px]">{item.symbol}</div>
                    <div className="text-[11px] text-slate-500">{item.name}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{item.category}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {item.value.toFixed(1)}
                  </td>
                  <td className="py-3 px-3">{renderSparkline(item.history)}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {item.latencyMs.toFixed(1)} ms
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {item.throughputQps.toLocaleString()} QPS
                  </td>
                  <td className="py-3 px-3 text-right">
                    {/* Clean unboxed status adhering to zero-pill discipline */}
                    <span
                      className={`font-medium ${
                        item.status === 'nominal'
                          ? 'text-emerald-700'
                          : item.status === 'warning'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {item.status === 'nominal' && '● Nominal'}
                      {item.status === 'warning' && '▲ Degraded'}
                      {item.status === 'critical' && '✖ Anomaly'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-500">
              No services match the current filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
