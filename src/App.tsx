/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header.tsx';
import { PhysicsEngine } from './components/PhysicsEngine.tsx';
import { PathfindingVisualizer } from './components/PathfindingVisualizer.tsx';
import { SortingVisualizer } from './components/SortingVisualizer.tsx';
import { DataEngine } from './components/DataEngine.tsx';
import { ArchitectureMatrix } from './components/ArchitectureMatrix.tsx';
import { DiagnosticsModal } from './components/DiagnosticsModal.tsx';
import { ActiveTab } from './types.ts';
import { soundSynth } from './utils/audio.ts';
import { ArrowRight, Sparkles, CheckCircle2, Shield, Layers, Cpu, Code2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('physics');
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Strict 3-zone Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRunDiagnostics={() => setIsDiagnosticsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-2">
              <span>Senior Software Engineering Capabilities</span>
              <span aria-hidden="true">·</span>
              <span>Full-Stack Benchmarks</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight leading-tight">
              Production-Grade Engineering Benchmarks & Systems Sandbox
            </h1>
            <p className="text-base text-slate-600 mt-3 leading-relaxed">
              Explore live, hardware-accelerated demonstrations showcasing real-time physics simulation,
              algorithmic graph traversal, acoustic sorting complexity, and high-throughput reactive data architecture.
            </p>
          </div>

          {/* Quick Tab Switcher Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8 pt-6 border-t border-slate-100">
            {[
              { id: 'physics', label: 'Physics Canvas', badge: '60 FPS 2D & Verlet' },
              { id: 'pathfinding', label: 'Pathfinding & Mazes', badge: 'A* & Dijkstra' },
              { id: 'sorting', label: 'Sorting Benchmark', badge: 'Audio Synthesizer' },
              { id: 'data-engine', label: 'Realtime Data Stream', badge: 'High-Throughput' },
              { id: 'architecture', label: 'Architecture Matrix', badge: 'Stack & Standards' },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundSynth.playClick();
                    setActiveTab(tab.id as ActiveTab);
                  }}
                  className={`text-left p-3 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                  }`}
                >
                  <div className="text-xs font-semibold truncate">{tab.label}</div>
                  <div
                    className={`text-[11px] mt-0.5 truncate ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {tab.badge}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Workbench Views */}
        {activeTab === 'physics' && <PhysicsEngine />}
        {activeTab === 'pathfinding' && <PathfindingVisualizer />}
        {activeTab === 'sorting' && <SortingVisualizer />}
        {activeTab === 'data-engine' && <DataEngine />}
        {activeTab === 'architecture' && <ArchitectureMatrix />}

        {/* What Can I Build For You Section */}
        <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Ready to build your next application?</h3>
              <p className="text-sm text-slate-600 mt-1">
                Tell me what you want to build in chat. I will design, architect, and deploy it end-to-end.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Full-Stack · Cloud SQL · OAuth · WebGL · Real-Time
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
            {[
              {
                title: 'Enterprise SaaS & Analytics',
                desc: 'PostgreSQL database with Drizzle ORM, multi-tenant RBAC, live telemetry charts, and automated reporting.',
              },
              {
                title: 'Interactive 2D/3D & Spatial Tools',
                desc: 'Canvas 2D/WebGL simulations, audio synthesizers, interactive CAD or graphing workbenches, and games.',
              },
              {
                title: 'Workflow & Google Workspace APIs',
                desc: 'Deep 1P integrations with Google Drive, Sheets, Docs, and Calendar with secure client-side authorization.',
              },
            ].map((card, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors"
              >
                <div className="text-xs font-bold text-slate-900">{card.title}</div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Clean quiet footer strictly complying with constitution */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span>Engineering Benchmark Suite</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>Client-side hardware acceleration active</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                soundSynth.playClick();
                setActiveTab('architecture');
              }}
              className="hover:text-slate-900 transition-colors"
            >
              Architecture Matrix
            </button>
            <button
              onClick={() => {
                soundSynth.playClick();
                setIsDiagnosticsOpen(true);
              }}
              className="hover:text-slate-900 transition-colors"
            >
              Hardware Diagnostics
            </button>
          </div>
        </div>
      </footer>

      {/* Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
    </div>
  );
}
