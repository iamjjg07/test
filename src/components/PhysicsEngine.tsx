import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Zap, Compass, Shield, Wind } from 'lucide-react';
import { soundSynth } from '../utils/audio.ts';

type SimMode = 'elastic' | 'vortex' | 'fabric';
type MouseMode = 'attract' | 'repel' | 'spawn';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  mass: number;
}

interface VerletPoint {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  pinned: boolean;
}

interface VerletStick {
  p1: VerletPoint;
  p2: VerletPoint;
  length: number;
}

const PALETTE = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const PhysicsEngine: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [simMode, setSimMode] = useState<SimMode>('elastic');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [particleCount, setParticleCount] = useState<number>(450);
  const [gravity, setGravity] = useState<number>(0.25);
  const [restitution, setRestitution] = useState<number>(0.85);
  const [trails, setTrails] = useState<boolean>(true);
  const [mouseMode, setMouseMode] = useState<MouseMode>('attract');

  // Telemetry metrics
  const [fps, setFps] = useState<number>(60);
  const [collisionEvents, setCollisionEvents] = useState<number>(0);
  const [kineticEnergy, setKineticEnergy] = useState<number>(0);

  // References for live animation without triggering react rerenders on every frame
  const particlesRef = useRef<Particle[]>([]);
  const fabricRef = useRef<{ points: VerletPoint[]; sticks: VerletStick[] }>({ points: [], sticks: [] });
  const mousePosRef = useRef<{ x: number; y: number; isDown: boolean }>({ x: -1000, y: -1000, isDown: false });
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcRef = useRef<number>(performance.now());
  const collisionsCountRef = useRef<number>(0);
  const animFrameIdRef = useRef<number>(0);

  // Initialize Particles for Elastic and Vortex modes
  const initParticles = useCallback((count: number, width: number, height: number, mode: SimMode) => {
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const radius = 2.5 + Math.random() * 3.5;
      const angle = Math.random() * Math.PI * 2;
      const speed = mode === 'vortex' ? 2 + Math.random() * 3 : Math.random() * 4 - 2;

      list.push({
        x: Math.random() * (width - 40) + 20,
        y: Math.random() * (height - 40) + 20,
        vx: mode === 'vortex' ? Math.cos(angle + Math.PI / 2) * speed : Math.cos(angle) * speed,
        vy: mode === 'vortex' ? Math.sin(angle + Math.PI / 2) * speed : Math.sin(angle) * speed,
        radius,
        color: PALETTE[i % PALETTE.length],
        mass: radius * 0.7,
      });
    }
    particlesRef.current = list;
  }, []);

  // Initialize Verlet Fabric Lattice
  const initFabric = useCallback((width: number, height: number) => {
    const cols = 22;
    const rows = 14;
    const spacing = Math.min((width - 120) / cols, (height - 120) / rows);
    const startX = (width - cols * spacing) / 2;
    const startY = 40;

    const points: VerletPoint[] = [];
    const sticks: VerletStick[] = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = startX + x * spacing;
        const py = startY + y * spacing;
        const pinned = y === 0 && (x % 3 === 0 || x === cols - 1);
        points.push({
          x: px,
          y: py,
          oldX: px + (Math.random() - 0.5) * 1.5,
          oldY: py,
          pinned,
        });
      }
    }

    // Horizontal and vertical structural sticks
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        if (x < cols - 1) {
          sticks.push({
            p1: points[idx],
            p2: points[idx + 1],
            length: spacing,
          });
        }
        if (y < rows - 1) {
          sticks.push({
            p1: points[idx],
            p2: points[idx + cols],
            length: spacing,
          });
        }
      }
    }

    fabricRef.current = { points, sticks };
  }, []);

  // Reset or reinitialize based on mode
  const resetSimulation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    if (simMode === 'fabric') {
      initFabric(width, height);
    } else {
      initParticles(particleCount, width, height, simMode);
    }
    collisionsCountRef.current = 0;
  }, [simMode, particleCount, initParticles, initFabric]);

  // Handle canvas sizing with high-DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      resetSimulation();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resetSimulation]);

  // Main simulation render loop
  useEffect(() => {
    let active = true;

    const render = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const ctx = canvas.getContext('2d');

      if (ctx && isRunning) {
        // Frame clearing with optional motion trail persistence
        if (trails && simMode !== 'fabric') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.clearRect(0, 0, width, height);
        }

        const mouse = mousePosRef.current;
        let totalEnergy = 0;
        let currentCollisions = 0;

        if (simMode === 'elastic') {
          const particles = particlesRef.current;
          const pLen = particles.length;

          for (let i = 0; i < pLen; i++) {
            const p = particles[i];

            // Apply gravity
            p.vy += gravity;

            // Mouse force
            if (mouse.x > 0 && mouse.y > 0) {
              const dx = mouse.x - p.x;
              const dy = mouse.y - p.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < 45000 && distSq > 20) {
                const dist = Math.sqrt(distSq);
                const force = (1 - dist / 220) * 1.8;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                if (mouseMode === 'attract') {
                  p.vx += fx;
                  p.vy += fy;
                } else if (mouseMode === 'repel') {
                  p.vx -= fx * 1.5;
                  p.vy -= fy * 1.5;
                }
              }
            }

            // Move
            p.x += p.vx;
            p.y += p.vy;

            // Boundary collision
            if (p.x - p.radius < 0) {
              p.x = p.radius;
              p.vx = -p.vx * restitution;
            } else if (p.x + p.radius > width) {
              p.x = width - p.radius;
              p.vx = -p.vx * restitution;
            }

            if (p.y - p.radius < 0) {
              p.y = p.radius;
              p.vy = -p.vy * restitution;
            } else if (p.y + p.radius > height) {
              p.y = height - p.radius;
              p.vy = -p.vy * restitution;
              // Friction
              p.vx *= 0.98;
            }

            // Energy calculation
            totalEnergy += 0.5 * p.mass * (p.vx * p.vx + p.vy * p.vy);

            // Draw particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          }

          // Sampled elastic particle-particle collisions (spatial optimization)
          const step = pLen > 800 ? 2 : 1;
          for (let i = 0; i < pLen; i += step) {
            for (let j = i + 1; j < Math.min(i + 25, pLen); j++) {
              const p1 = particles[i];
              const p2 = particles[j];
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const distSq = dx * dx + dy * dy;
              const minDist = p1.radius + p2.radius;

              if (distSq < minDist * minDist && distSq > 0) {
                currentCollisions++;
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;

                // Position separation
                const overlap = (minDist - dist) * 0.5;
                p1.x -= nx * overlap;
                p1.y -= ny * overlap;
                p2.x += nx * overlap;
                p2.y += ny * overlap;

                // Relative velocity
                const kx = p1.vx - p2.vx;
                const ky = p1.vy - p2.vy;
                const p = 2 * (nx * kx + ny * ky) / (p1.mass + p2.mass);

                p1.vx -= p * p2.mass * nx * restitution;
                p1.vy -= p * p2.mass * ny * restitution;
                p2.vx += p * p1.mass * nx * restitution;
                p2.vy += p * p1.mass * ny * restitution;
              }
            }
          }
        } else if (simMode === 'vortex') {
          // Gravitational dynamic vortex
          const particles = particlesRef.current;
          const centerX = mouse.x > 0 ? mouse.x : width / 2;
          const centerY = mouse.y > 0 ? mouse.y : height / 2;

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const dx = centerX - p.x;
            const dy = centerY - p.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq) + 10;

            // Gravitational pull + tangential orbital swirl
            const gravityForce = 450 / distSq;
            const tangentialX = -dy / dist;
            const tangentialY = dx / dist;

            p.vx += (dx / dist) * gravityForce + tangentialX * 0.25;
            p.vy += (dy / dist) * gravityForce + tangentialY * 0.25;

            // Dampening
            p.vx *= 0.992;
            p.vy *= 0.992;

            p.x += p.vx;
            p.y += p.vy;

            // Soft bounds wrap
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            totalEnergy += 0.5 * p.mass * (p.vx * p.vx + p.vy * p.vy);

            // Draw with velocity glow
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          }
        } else if (simMode === 'fabric') {
          // Verlet Spring Lattice Integration
          const { points, sticks } = fabricRef.current;

          // 1. Update points (Verlet integration)
          for (let i = 0; i < points.length; i++) {
            const p = points[i];
            if (p.pinned) continue;

            const vx = (p.x - p.oldX) * 0.99;
            const vy = (p.y - p.oldY) * 0.99 + gravity * 0.8;

            p.oldX = p.x;
            p.oldY = p.y;

            p.x += vx;
            p.y += vy;

            // Mouse interaction with cloth
            if (mouse.x > 0 && mouse.y > 0) {
              const dx = mouse.x - p.x;
              const dy = mouse.y - p.y;
              const distSq = dx * dx + dy * dy;
              if (distSq < 6400) {
                const dist = Math.sqrt(distSq);
                const push = (1 - dist / 80) * (mouseMode === 'repel' ? 14 : -14);
                p.x += (dx / dist) * push;
                p.y += (dy / dist) * push;
              }
            }

            // Floor constraint
            if (p.y > height - 10) {
              p.y = height - 10;
              p.oldY = p.y;
            }
          }

          // 2. Relax constraints multiple times for stiffness
          const iterations = 5;
          for (let it = 0; it < iterations; it++) {
            for (let s = 0; s < sticks.length; s++) {
              const stick = sticks[s];
              const dx = stick.p2.x - stick.p1.x;
              const dy = stick.p2.y - stick.p1.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist === 0) continue;
              const diff = (stick.length - dist) / dist;
              const offsetX = dx * diff * 0.5;
              const offsetY = dy * diff * 0.5;

              if (!stick.p1.pinned) {
                stick.p1.x -= offsetX;
                stick.p1.y -= offsetY;
              }
              if (!stick.p2.pinned) {
                stick.p2.x += offsetX;
                stick.p2.y += offsetY;
              }
            }
          }

          // 3. Draw sticks
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let s = 0; s < sticks.length; s++) {
            const stick = sticks[s];
            ctx.moveTo(stick.p1.x, stick.p1.y);
            ctx.lineTo(stick.p2.x, stick.p2.y);
          }
          ctx.stroke();

          // 4. Draw points
          for (let i = 0; i < points.length; i++) {
            const p = points[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.pinned ? 4 : 2, 0, Math.PI * 2);
            ctx.fillStyle = p.pinned ? '#dc2626' : '#312e81';
            ctx.fill();
          }
        }

        // FPS calculation window
        frameCountRef.current++;
        const now = performance.now();
        if (now - lastFpsCalcRef.current >= 400) {
          const deltaSec = (now - lastFpsCalcRef.current) / 1000;
          setFps(Math.round(frameCountRef.current / deltaSec));
          setCollisionEvents(currentCollisions * 30);
          setKineticEnergy(Math.round(totalEnergy));
          frameCountRef.current = 0;
          lastFpsCalcRef.current = now;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);
    return () => {
      active = false;
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isRunning, simMode, gravity, restitution, trails, mouseMode]);

  // Mouse interaction event listeners
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isDown: mousePosRef.current.isDown,
    };

    if (mousePosRef.current.isDown && mouseMode === 'spawn' && simMode !== 'fabric') {
      const radius = 3 + Math.random() * 3;
      particlesRef.current.push({
        x: mousePosRef.current.x,
        y: mousePosRef.current.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        radius,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        mass: radius * 0.7,
      });
      if (particlesRef.current.length > 1500) {
        particlesRef.current.shift();
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mousePosRef.current.isDown = true;
    soundSynth.playClick();
    handleMouseMove(e);
  };

  const handleMouseUp = () => {
    mousePosRef.current.isDown = false;
  };

  const handleMouseLeave = () => {
    mousePosRef.current = { x: -1000, y: -1000, isDown: false };
  };

  return (
    <div className="space-y-6">
      {/* Top Section Header & KPI Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              01. Real-Time Physics & Particle Dynamics Engine
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              High-performance 60 FPS HTML5 Canvas engine implementing elastic N-body collision kinematics,
              gravitational orbital vortex fields, and Verlet constraint cloth simulation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                soundSynth.playClick();
                setIsRunning(!isRunning);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isRunning
                  ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause Engine' : 'Resume Engine'}</span>
            </button>

            <button
              onClick={() => {
                soundSynth.playClick();
                resetSimulation();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row (Constitution: Tabular figures, unboxed metadata) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-5">
          <div>
            <div className="text-xs text-slate-500 font-medium">Render Frame Rate</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {fps} <span className="text-xs font-normal text-slate-500">FPS</span>
            </div>
            <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Hardware accelerated
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Active Simulated Entities</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {simMode === 'fabric' ? fabricRef.current.points.length : particlesRef.current.length}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {simMode === 'fabric' ? 'Verlet lattice nodes' : '2D kinetic particles'}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Calculations / Sec</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {collisionEvents.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">Spatial checks / resolution</div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Kinetic Momentum Energy</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {kineticEnergy.toLocaleString()} <span className="text-xs font-normal text-slate-500">J</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">Dynamic velocity vector sum</div>
          </div>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Toolbar & Simulation Parameters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 h-fit shadow-sm">
          <div>
            <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">Simulation Mode</label>
            <div className="grid grid-cols-1 gap-1.5 mt-2">
              {[
                { id: 'elastic', label: 'Elastic Kinetic Particles', desc: 'Particle-particle collision restitution' },
                { id: 'vortex', label: 'Gravitational Vortex Field', desc: 'Orbital velocity & central attractor' },
                { id: 'fabric', label: 'Verlet Constraint Fabric', desc: 'Interactive spring-mass cloth lattice' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    soundSynth.playClick();
                    setSimMode(m.id as SimMode);
                  }}
                  className={`p-2.5 rounded-lg text-left transition-all ${
                    simMode === m.id
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-medium'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700'
                  }`}
                >
                  <div className="text-xs font-semibold">{m.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">Mouse Cursor Dynamic</label>
            <div className="flex gap-1.5 mt-2">
              {(['attract', 'repel', 'spawn'] as MouseMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    soundSynth.playClick();
                    setMouseMode(mode);
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                    mouseMode === mode
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {simMode !== 'fabric' && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Particle Density</span>
                  <span className="font-mono tabular-nums">{particleCount}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1200"
                  step="50"
                  value={particleCount}
                  onChange={(e) => {
                    const count = parseInt(e.target.value);
                    setParticleCount(count);
                    const canvas = canvasRef.current;
                    if (canvas) {
                      initParticles(count, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1), simMode);
                    }
                  }}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Vertical Gravity</span>
                  <span className="font-mono tabular-nums">{gravity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={gravity}
                  onChange={(e) => setGravity(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>Restitution / Elasticity</span>
                  <span className="font-mono tabular-nums">{restitution.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="0.99"
                  step="0.05"
                  value={restitution}
                  onChange={(e) => setRestitution(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-600">Motion Trails</span>
                <input
                  type="checkbox"
                  checked={trails}
                  onChange={(e) => setTrails(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {simMode === 'fabric' && (
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1.5 border border-slate-100">
              <div className="font-medium text-slate-800">Verlet Cloth Instructions:</div>
              <p>Move mouse over fabric to deform mesh with dynamic wind tension.</p>
              <p>Top red anchor nodes are pinned with infinite mass.</p>
            </div>
          )}
        </div>

        {/* Viewport Canvas Container */}
        <div
          ref={containerRef}
          className="lg:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden relative min-h-[500px] shadow-sm flex flex-col"
        >
          <div className="p-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <span className="font-medium text-slate-700">Canvas Viewport</span>
              <span aria-hidden="true">·</span>
              <span>Drag or hover inside canvas to interact</span>
            </div>
            <div className="font-mono tabular-nums text-[11px]">
              Engine: HTML5 2D Canvas · Verlet / Euler
            </div>
          </div>

          <div className="relative flex-1 bg-white cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className="absolute inset-0 w-full h-full block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
