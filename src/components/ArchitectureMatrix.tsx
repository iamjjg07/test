import React, { useState } from 'react';
import { Database, Server, Cpu, Globe, Key, ShieldCheck, Check, Copy, Code2 } from 'lucide-react';
import { soundSynth } from '../utils/audio.ts';

interface CapabilitySpec {
  title: string;
  category: string;
  techStack: string[];
  description: string;
  codeSnippet: string;
}

const CAPABILITIES: CapabilitySpec[] = [
  {
    title: 'Full-Stack TypeScript & Node Architecture',
    category: 'Backend & Systems',
    techStack: ['Node.js', 'Express 4.21', 'Vite 6', 'TypeScript 5.8', 'tsx'],
    description:
      'Seamless server-side proxies, high-throughput REST/JSON RPC APIs, environment secrets management, and Vite development middleware integration.',
    codeSnippet: `import express from 'express';
import { createServer } from 'http';

const app = express();
app.use(express.json());

// Type-safe API endpoints with runtime verification
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptimeSec: process.uptime() });
});`,
  },
  {
    title: 'Relational & Document Database Engineering',
    category: 'Persistence & Schemas',
    techStack: ['Cloud SQL (PostgreSQL)', 'Drizzle ORM', 'Firebase Firestore', 'Security Rules'],
    description:
      'Instant developer-tier relational PostgreSQL provisioning, declarative Drizzle migrations, role-based firestore.rules, and ACID transaction isolation.',
    codeSnippet: `// Drizzle ORM PostgreSQL Schema
import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';

export const benchmarkRuns = pgTable('benchmark_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  algorithm: text('algorithm').notNull(),
  executionTimeMs: integer('execution_time_ms').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});`,
  },
  {
    title: 'Interactive 2D/3D Canvas & Audio DSP',
    category: 'Graphics & Real-Time',
    techStack: ['HTML5 Canvas 2D', 'Three.js / WebGL', 'Web Audio API', 'Verlet Dynamics'],
    description:
      'Zero-lag 60 FPS animation loops, custom N-body particle collision resolution, procedural maze algorithms, and browser synthesizer audio nodes.',
    codeSnippet: `// Web Audio API custom synthesizer frequency mapping
const audioCtx = new AudioContext();
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();

osc.frequency.setValueAtTime(440 * Math.pow(2, (note - 69) / 12), audioCtx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
osc.connect(gain).connect(audioCtx.destination);
osc.start();`,
  },
  {
    title: 'Google Workspace & OAuth 2.0 Security',
    category: 'Identity & Integrations',
    techStack: ['Google OAuth 2.0', 'Drive API', 'Sheets API', 'Calendar API', 'RBAC'],
    description:
      'Enterprise Google Workspace integration, client-side token authorization via Bearer headers, scoped permissions, and iframe-safe authentication.',
    codeSnippet: `// Scoped 1P Google Workspace Client-Side Authorization
const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
  headers: {
    Authorization: \`Bearer \${userAccessToken}\`,
    'Content-Type': 'application/json',
  },
});
const sheetData = await response.json();`,
  },
  {
    title: 'Universal Frontend Design Constitution',
    category: 'UI/UX Craftsmanship',
    techStack: ['Tailwind CSS v4', 'WCAG AA', 'Motion', 'Plus Jakarta Sans', 'Tabular Figures'],
    description:
      'Strict zero-pill metadata discipline, 60-30-10 color balance, single-line control enforcement, responsive 1440px viewport layouts, and zero broken assets.',
    codeSnippet: `/* Tabular figures for jitter-free data & zero pill clutter */
.metric-row {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
/* Unboxed metadata with typographic separators */
.meta-item::after {
  content: "·";
  margin: 0 0.5rem;
  color: #94a3b8;
}`,
  },
];

export const ArchitectureMatrix: React.FC = () => {
  const [selectedCap, setSelectedCap] = useState<CapabilitySpec>(CAPABILITIES[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    soundSynth.playClick();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="pb-5 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            05. Core Engineering Architecture & Capabilities Matrix
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            A concrete overview of the technical stack, architectural standards, and system capabilities
            powering full-stack applications in this environment.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Full-Stack Sovereignty</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Express and Node.js backend proxy routes, environment security, and real REST/RPC endpoints.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Multi-Tier Persistence</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Relational PostgreSQL with Drizzle ORM or real-time Firestore with role-based security rules.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Production Craftsmanship</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Zero-pill discipline, WCAG AA compliance, 60 FPS graphics, and mathematically grounded typography.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Architecture Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Capability Selectors List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 px-2 py-1">
            Core Disciplines
          </div>
          {CAPABILITIES.map((cap) => {
            const isSelected = selectedCap.title === cap.title;
            return (
              <button
                key={cap.title}
                onClick={() => {
                  soundSynth.playClick();
                  setSelectedCap(cap);
                }}
                className={`w-full text-left p-3.5 rounded-lg transition-all ${
                  isSelected
                    ? 'bg-indigo-50 border border-indigo-200 shadow-xs'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="text-[11px] text-slate-500 font-medium">{cap.category}</div>
                <div className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                  {cap.title}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                  <span>{cap.techStack[0]}</span>
                  <span aria-hidden="true">·</span>
                  <span>{cap.techStack[1]}</span>
                  <span aria-hidden="true">·</span>
                  <span>+{cap.techStack.length - 2} more</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Capability Inspector */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs text-indigo-600 font-semibold">{selectedCap.category}</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedCap.title}</h3>
              </div>
              <button
                onClick={() => handleCopy(selectedCap.codeSnippet)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">{selectedCap.description}</p>

            {/* Tech Stack list adhering to unboxed zero-pill rule */}
            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-600 mt-3">
              <span className="font-semibold text-slate-800">Stack:</span>
              {selectedCap.techStack.map((tech, idx) => (
                <React.Fragment key={tech}>
                  <span className="font-mono text-[11px] text-slate-700">{tech}</span>
                  {idx < selectedCap.techStack.length - 1 && <span aria-hidden="true" className="text-slate-400">·</span>}
                </React.Fragment>
              ))}
            </div>

            {/* Code Snippet Box */}
            <div className="mt-4 bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800 leading-relaxed">
              <pre>{selectedCap.codeSnippet}</pre>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Verified compatibility: Web, Node 22, React 19, TypeScript 5.8</span>
            <span className="text-emerald-700 font-medium">Ready for deployment</span>
          </div>
        </div>
      </div>
    </div>
  );
};
