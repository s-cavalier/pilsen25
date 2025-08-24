import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

// --- Types ---
export type ActivationComponentProps = {
  layers: number[];
  inputVector: number[];
  onResult: (vector: number[]) => void;
  stepMs?: number;
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tanh = (x: number) => Math.tanh(x);
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

function matVecMul(W: number[][], x: number[], b?: number[]) {
  return W.map((row, i) => dot(row, x) + (b ? b[i] : 0));
}

function applyActivation(x: number[], fn: (v: number) => number) {
  return x.map(fn);
}

function valueToColor(v: number) {
  const clamped = Math.max(-1, Math.min(1, v));
  if (clamped >= 0) {
    const t = clamped;
    const r = 255;
    const g = Math.round(255 * (1 - 0.45 * t));
    const b = Math.round(255 * (1 - 0.9 * t));
    return `rgb(${r},${g},${b})`;
  } else {
    const t = -clamped;
    const r = Math.round(255 * (1 - 0.9 * t));
    const g = Math.round(255 * (1 - 0.95 * t));
    const b = 255;
    return `rgb(${r},${g},${b})`;
  }
}

function normalizeColoring(x: number[]) {
  const m = Math.max(1e-6, Math.max(...x.map((v) => Math.abs(v))));
  return x.map((v) => v / m);
}

function layoutLayers(layerCounts: number[], width: number, height: number) {
  const L = layerCounts.length;
  const xGap = width / (L + 1);
  const columns = [] as { x: number; ys: number[] }[];
  for (let l = 0; l < L; l++) {
    const n = layerCounts[l];
    const x = xGap * (l + 1);
    const yGap = height / (n + 1);
    const ys = Array.from({ length: n }, (_, i) => yGap * (i + 1));
    columns.push({ x, ys });
  }
  return columns;
}

const ActivationCanvas: React.FC<ActivationComponentProps> = ({
  layers,
  inputVector,
  onResult,
  stepMs = 750,
}) => {
  const [animLayer, setAnimLayer] = useState<number>(-1);
  const [isAnimating, setIsAnimating] = useState(false);

  const fullCounts = useMemo(() => [inputVector.length, ...layers], [inputVector.length, layers]);

  const weights = useMemo(() => {
    const seed = layers.reduce((s, v, i) => s + (i + 1) * v, inputVector.length * 131);
    const rng = mulberry32(seed);
    const arr: { W: number[][]; b: number[] }[] = [];
    for (let l = 0; l < fullCounts.length - 1; l++) {
      const inN = fullCounts[l];
      const outN = fullCounts[l + 1];
      const scale = Math.sqrt(1 / inN);
      const W = Array.from({ length: outN }, () =>
        Array.from({ length: inN }, () => (rng() * 2 - 1) * scale)
      );
      const b = Array.from({ length: outN }, () => (rng() * 2 - 1) * 0.1);
      arr.push({ W, b });
    }
    return arr;
  }, [fullCounts, layers, inputVector.length]);

  const allActivations = useMemo(() => {
    const acts: number[][] = [inputVector.slice()];
    for (let l = 0; l < weights.length; l++) {
      const z = matVecMul(weights[l].W, acts[l], weights[l].b);
      const a = applyActivation(z, tanh);
      acts.push(a);
    }
    return acts;
  }, [inputVector, weights]);

  const output = allActivations[allActivations.length - 1];

  const timersRef = useRef<number[]>([]);
  const onActivate = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setAnimLayer(-1);

    for (let l = 0; l < fullCounts.length - 1; l++) {
      const t = window.setTimeout(() => setAnimLayer(l), stepMs * (l + 1));
      timersRef.current.push(t);
    }
    const doneT = window.setTimeout(() => {
      setIsAnimating(false);
      setAnimLayer(-1);
      onResult(output);
      timersRef.current = [];
    }, stepMs * (fullCounts.length));
    timersRef.current.push(doneT);
  };

  useEffect(() => () => timersRef.current.forEach((t) => window.clearTimeout(t)), []);

  const width = 900;
  const height = 420;
  const cols = useMemo(() => layoutLayers(fullCounts, width, height), [fullCounts]);

  function edgeStrength(l: number, iPrev: number, iNext: number) {
    const w = weights[l].W[iNext][iPrev];
    const aPrev = allActivations[l][iPrev];
    return w * aPrev;
  }

  function strengthToStrokeWidth(s: number) {
    const mag = Math.min(1, Math.abs(s) * 2);
    return 0.5 + 4 * mag;
  }
  function strengthToColor(s: number) {
    const v = Math.max(-1, Math.min(1, s));
    return v >= 0 ? "#f59e0b" : "#3b82f6";
  }
  function strengthOpacity(s: number, active: boolean) {
    return active ? 0.9 : 0.15 + Math.min(0.3, Math.abs(s));
  }

  function neuronR(n: number) {
    return 10 + Math.min(12, Math.max(0, 60 / (n + 2)));
  }

  const coloredActs = allActivations.map(normalizeColoring);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[960px]">
        <h2 className="text-xl font-semibold">The AI</h2>
        <button
          onClick={onActivate}
          disabled={isAnimating}
          className="px-4 py-2 rounded-2xl shadow bg-black text-white disabled:opacity-50"
        >
          {isAnimating ? "Running…" : "Activate"}
        </button>
      </div>

      <div className="w-full max-w-[960px] rounded-2xl p-4 bg-white border shadow-sm">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {fullCounts.slice(0, -1).map((nPrev, l) => {
            const nNext = fullCounts[l + 1];
            return (
              <g key={`edges-${l}`}>
                {Array.from({ length: nPrev }).map((_, iPrev) =>
                  Array.from({ length: nNext }).map((_, iNext) => {
                    const x1 = cols[l].x,
                      y1 = cols[l].ys[iPrev];
                    const x2 = cols[l + 1].x,
                      y2 = cols[l + 1].ys[iNext];
                    const s = edgeStrength(l, iPrev, iNext);
                    const active = animLayer === l;
                    const sw = active ? strengthToStrokeWidth(s) : 1.2;
                    const color = active ? strengthToColor(s) : "#c7c7c7";
                    const opacity = strengthOpacity(s, active);
                    return (
                      <motion.line
                        key={`e-${l}-${iPrev}-${iNext}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={color}
                        strokeWidth={sw}
                        strokeOpacity={opacity}
                        initial={{ opacity: 0.0 }}
                        animate={{ opacity }}
                        transition={{ duration: 0.4 }}
                      />
                    );
                  })
                )}
              </g>
            );
          })}

          {fullCounts.map((n, l) => (
            <g key={`layer-${l}`}>
              {Array.from({ length: n }).map((_, i) => {
                const x = cols[l].x;
                const y = cols[l].ys[i];
                const v = coloredActs[l][i] ?? 0;
                const r = neuronR(n);
                const fill = valueToColor(v);
                const isActive = animLayer === l - 1 || (l === 0 && animLayer >= -1);
                return (
                  <g key={`n-${l}-${i}`}>
                    <motion.circle
                      cx={x}
                      cy={y}
                      r={r}
                      fill={fill}
                      stroke="#111827"
                      strokeWidth={1}
                      initial={{ scale: 0.8, opacity: 0.0 }}
                      animate={{ scale: isActive ? 1.0 : 0.98, opacity: 1.0 }}
                      transition={{ type: "spring", stiffness: 150, damping: 18 }}
                    />
                  </g>
                );
              })}
            </g>
          ))}

          {fullCounts.map((n, l) => (
            <text
              key={`lbl-${l}`}
              x={cols[l].x}
              y={24}
              textAnchor="middle"
              fontSize={12}
              fill="#374151"
            >
              {l === 0 ? `Input (${n})` : l === fullCounts.length - 1 ? `Output (${n})` : `Layer ${l} (${n})`}
            </text>
          ))}
        </svg>

        <div className="mt-3 text-sm text-gray-600">
          <span className="font-medium">Tip:</span> Colors indicate activation sign and magnitude (blue = negative, orange = positive). Edges thicken during the animation based on contribution.
        </div>
      </div>
    </div>
  );
};

export default ActivationCanvas;
