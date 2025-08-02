'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Box, IconButton, Button, TextField, Paper, Typography, Stack } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

// Types
export interface NeuralNetworkStructure {
  layers: number[]; // neurons per layer
  weights?: number[][][]; // weights[layerIndex][fromNeuron][toNeuron]
}

export interface NeuralNetworkEditorProps {
  backendEndpoint: string; // e.g. '/api/infer'
  initialStructure?: NeuralNetworkStructure;
}

// Helpers
function initializeWeights(layers: number[]): number[][][] {
  return layers.slice(1).map((toCount, li) => {
    const fromCount = layers[li];
    return Array.from({ length: fromCount }, () =>
      Array.from({ length: toCount }, () => Math.random() * 2 - 1)
    );
  });
}
function zeroWeights(layers: number[]): number[][][] {
  return layers.slice(1).map((toCount, li) => {
    const fromCount = layers[li];
    return Array.from({ length: fromCount }, () =>
      Array.from({ length: toCount }, () => 0)
    );
  });
}

// Activation animation helpers
type Activations = number[][]; // per layer

const NeuralNetworkEditor: React.FC<NeuralNetworkEditorProps> = ({
  backendEndpoint,
  initialStructure = { layers: [3, 4, 2] },
}) => {
  const [layers, setLayers] = useState<number[]>([...initialStructure.layers]);
  const [weights, setWeights] = useState<number[][][]>(() => {
    return initialStructure.weights ? initialStructure.weights : zeroWeights(layers);
  });
  const [inputText, setInputText] = useState<string>('0,0,0');
  const [backendResponse, setBackendResponse] = useState<any>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [activations, setActivations] = useState<Activations | null>(null); // latest from backend
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set()); // keys like `${layer}-${neuron}`

  // on initial mount, swap to random weights (hydration-safe)
  React.useEffect(() => {
    setWeights(initializeWeights(layers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync topology changes (layers) immediately with weights, clear activations
  const rebuildTopology = (newLayers: number[]) => {
    setLayers(newLayers);
    setWeights(initializeWeights(newLayers));
    setActivations(null);
  };

  const addLayer = useCallback(() => {
    setLayers((prev) => {
      const copy = [...prev];
      const insertIdx = copy.length - 1;
      const left = copy[insertIdx - 1] ?? 3;
      const right = copy[insertIdx] ?? 3;
      const newSize = Math.max(1, Math.round((left + right) / 2));
      copy.splice(insertIdx, 0, newSize);
      setWeights(initializeWeights(copy));
      setActivations(null);
      return copy;
    });
  }, []);

  const removeLayer = useCallback(() => {
    setLayers((prev) => {
      if (prev.length <= 2) return prev;
      const copy = [...prev];
      copy.splice(copy.length - 2, 1);
      setWeights(initializeWeights(copy));
      setActivations(null);
      return copy;
    });
  }, []);

  const addNeuron = (layerIdx: number) => {
    setLayers((prev) => {
      const copy = [...prev];
      copy[layerIdx] = copy[layerIdx] + 1;
      setWeights(initializeWeights(copy));
      setActivations(null);
      return copy;
    });
  };
  const removeNeuron = (layerIdx: number) => {
    setLayers((prev) => {
      const copy = [...prev];
      if (copy[layerIdx] <= 1) return copy;
      copy[layerIdx] = copy[layerIdx] - 1;
      setWeights(initializeWeights(copy));
      setActivations(null);
      return copy;
    });
  };

  // Highlight helper: flash neurons
  const flashActivations = (acts: Activations) => {
    setActivations(acts);
    // sequentially highlight each layer briefly
    acts.forEach((layerActs, li) => {
      setTimeout(() => {
        setHighlighted((prev) => {
          const next = new Set(prev);
          layerActs.forEach((_, ni) => next.add(`${li}-${ni}`));
          return next;
        });
        setTimeout(() => {
          setHighlighted((prev) => {
            const next = new Set(prev);
            layerActs.forEach((_, ni) => next.delete(`${li}-${ni}`));
            return next;
          });
        }, 400);
      }, li * 300);
    });
  };

  const handleSend = async () => {
    const parsed = inputText
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !Number.isNaN(n));
    if (parsed.length !== layers[0]) {
      alert(`Expected input length ${layers[0]}, got ${parsed.length}`);
      return;
    }
    try {
      setSending(true);
      let data: any;
      if (backendEndpoint === '__test__') {
        // temporary hook: simulate activations with random values matching layers
        const simulated: Activations = layers.map((cnt) =>
          Array.from({ length: cnt }, () => Math.random())
        );
        data = { activations: simulated, output: simulated[simulated.length - 1] };
        // small delay to feel async
        await new Promise((r) => setTimeout(r, 300));
      } else {
        const res = await fetch(backendEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: parsed }),
        });
        data = await res.json();
      }
      setBackendResponse(data);
      if (data.activations && Array.isArray(data.activations)) {
        flashActivations(data.activations as Activations);
      }
    } finally {
      setSending(false);
    }
  };

  // SVG visualization with activations affecting fill intensity
  const svgContent = useMemo(() => {
    const layerSpacing = 220;
    const neuronRadius = 12;
    const width = (layers.length - 1) * layerSpacing + 240;
    const maxNeurons = Math.max(...layers);
    const height = maxNeurons * 60 + 120;
    const positions: { x: number; y: number }[][] = layers.map((count, li) => {
      const x = 120 + li * layerSpacing;
      const totalH = (count - 1) * 60;
      return Array.from({ length: count }, (_, ni) => {
        const y = (height - totalH) / 2 + ni * 60;
        return { x, y };
      });
    });
    const lines: React.ReactElement[] = [];
    weights.forEach((fromLayer, li) => {
      if (!positions[li] || !positions[li + 1]) return;
      const fromLayerPositions = positions[li];
      const toLayerPositions = positions[li + 1];
      fromLayer.forEach((toWeights, fromIdx) => {
        toWeights.forEach((w, toIdx) => {
          const fromPos = fromLayerPositions[fromIdx];
          const toPos = toLayerPositions[toIdx];
          if (!fromPos || !toPos) return;
          const intensity = Math.min(1, Math.abs(w));
          const baseColor = w >= 0 ? [33, 150, 243] : [244, 67, 54];
          const stroke = `rgba(${baseColor.join(',')}, ${intensity})`;
          lines.push(
            <line
              key={`w-${li}-${fromIdx}-${toIdx}`}
              x1={fromPos.x + neuronRadius}
              y1={fromPos.y}
              x2={toPos.x - neuronRadius}
              y2={toPos.y}
              stroke={stroke}
              strokeWidth={Math.max(1, intensity * 3)}
            />
          );
        });
      });
    });

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {lines}
        {positions.map((layerPos, li) =>
          layerPos.map((p, ni) => {
            const key = `${li}-${ni}`;
            const activationVal = activations?.[li]?.[ni] ?? 0;
            // map activation to fill intensity (with a minimum)
            const fillAlpha = Math.min(1, Math.max(0.1, activationVal));
            const isHighlighted = highlighted.has(key);
            return (
              <g key={`n-${li}-${ni}`}> 
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={neuronRadius}
                  fill={isHighlighted ? '#ffe57f' : '#fff'}
                  stroke="#444"
                  strokeWidth={2}
                  style={{ transition: 'fill 0.25s ease' }}
                />
                {activations && (
                  <text
                    x={p.x}
                    y={p.y + 4}
                    fontSize={10}
                    textAnchor="middle"
                    pointerEvents="none"
                    style={{ userSelect: 'none' }}
                  >
                    {activationVal.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>
    );
  }, [layers, weights, activations, highlighted]);

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 3, maxWidth: '100%' }}>
      <Stack spacing={2}>
        <Typography variant="h6">ABC Pilsen AI Developer</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
          <Stack spacing={1}>
            <Typography variant="subtitle2">Layers</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton aria-label="remove layer" onClick={removeLayer} size="small">
                <RemoveCircleOutlineIcon />
              </IconButton>
              <Typography>{layers.map((l) => l).join(' - ')}</Typography>
              <IconButton aria-label="add layer" onClick={addLayer} size="small">
                <AddCircleOutlineIcon />
              </IconButton>
            </Stack>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="subtitle2">Input</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={Array.from({ length: layers[0] }, () => '0').join(',')}
                inputProps={{ 'aria-label': 'network input vector' }}
              />
              <Button variant="contained" onClick={handleSend} disabled={sending}>
                Send
              </Button>
              <Button variant="outlined" onClick={() => handleSend()} disabled={sending} sx={{ ml: 1 }}>
                Test Anim
              </Button>
            </Stack>
          </Stack>
        </Stack>
        <Box>
          <Typography variant="subtitle2">Topology</Typography>
          <Box sx={{ overflowX: 'auto' }}>{svgContent}</Box>
        </Box>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {layers.map((count, idx) => (
            <Paper key={`layer-controls-${idx}`} variant="outlined" sx={{ p: 1, minWidth: 120, mr: 1 }}>
              <Typography variant="caption">Layer {idx}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small" aria-label="remove neuron" onClick={() => removeNeuron(idx)}>
                  <RemoveCircleOutlineIcon fontSize="small" />
                </IconButton>
                <Typography>{count}</Typography>
                <IconButton size="small" aria-label="add neuron" onClick={() => addNeuron(idx)}>
                  <AddCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
        <Box>
          <Typography variant="subtitle2">Backend Response</Typography>
          <Paper variant="outlined" sx={{ p: 2, minHeight: 100, backgroundColor: '#f5f5f5' }}>
            <pre style={{ margin: 0, fontSize: 12, overflowX: 'auto' }}>
              {backendResponse ? JSON.stringify(backendResponse, null, 2) : 'No response yet.'}
            </pre>
          </Paper>
        </Box>
      </Stack>
    </Paper>
  );
};

export default NeuralNetworkEditor;
