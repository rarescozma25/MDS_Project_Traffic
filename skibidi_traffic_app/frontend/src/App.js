// src/App.js
import React, { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Circle, Group } from 'react-konva';
import './App.css';

// Dimensiuni canvas și setări drum
const WIDTH = 900;
const HEIGHT = 600;
const ROAD_WIDTH = 100;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const LANE_OFFSET = ROAD_WIDTH / 4;
const DASH = [10, 10];

// Definirea benzilor (circulație pe dreapta)
const LANES = [
  { id: 'E', path: [0, CENTER_Y + LANE_OFFSET, WIDTH, CENTER_Y + LANE_OFFSET] },
  { id: 'W', path: [WIDTH, CENTER_Y - LANE_OFFSET, 0, CENTER_Y - LANE_OFFSET] },
  { id: 'S', path: [CENTER_X - LANE_OFFSET, 0, CENTER_X - LANE_OFFSET, HEIGHT] },
  { id: 'N', path: [CENTER_X + LANE_OFFSET, HEIGHT, CENTER_X + LANE_OFFSET, 0] }
];

// Calculează poziția și unghiul pe un path
function getPos(points, prog) {
  let total = 0;
  const segs = [];
  for (let i = 0; i < points.length - 2; i += 2) {
    const x1 = points[i], y1 = points[i + 1];
    const x2 = points[i + 2], y2 = points[i + 3];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    segs.push({ x1, y1, dx, dy, len });
    total += len;
  }
  let dist = total * prog;
  for (const seg of segs) {
    if (dist <= seg.len) {
      const t = dist / seg.len;
      const x = seg.x1 + seg.dx * t;
      const y = seg.y1 + seg.dy * t;
      const angle = Math.atan2(seg.dy, seg.dx);
      return { x, y, angle };
    }
    dist -= seg.len;
  }
  return null;
}

export default function App() {
  // Configurație inițială: verde/roșu și flux vehicule/minut
  const initialConfig = LANES.reduce((acc, lane) => {
    acc[lane.id] = { green: 5000, red: 5000, flow: 5 };
    return acc;
  }, {});
  const [config, setConfig] = useState(initialConfig);

  const [lights, setLights] = useState([]);       // semafoare adăugate de utilizator
  const [cars, setCars]     = useState([]);       // lista de mașini în scenă
  const [placingDir, setPlacingDir] = useState(null); // direcție selectată pentru plasare semafor

  // Generare mașini conform fluxului pe fiecare bandă
  useEffect(() => {
    const intervals = LANES.map(lane => {
      const ms = 60000 / config[lane.id].flow;
      return setInterval(() => addCar(lane.id), ms);
    });
    return () => intervals.forEach(clearInterval);
  }, [config]);

  // Funcție de adăugare mașină
  const addCar = laneId => {
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    setCars(prev => [
      ...prev,
      { id: Date.now() + Math.random(), laneId, progress: 0, speed: 0.002 + Math.random() * 0.002, color }
    ]);
  };

  // Ticker comun pentru semafoare (100ms)
  useEffect(() => {
    const tick = setInterval(() => {
      setLights(prev =>
        prev.map(light => {
          let rem = light.remaining ?? config[light.laneId][light.state];
          rem -= 100;
          let state = light.state;
          if (rem <= 0) {
            state = state === 'green' ? 'red' : 'green';
            rem = config[light.laneId][state];
          }
          return { ...light, state, remaining: rem };
        })
      );
    }, 100);
    return () => clearInterval(tick);
  }, [config]);

  // Animație mașini: respectă semafoarele, evită coliziunile și dispar la capăt
  useEffect(() => {
    const iv = setInterval(() => {
      setCars(prevCars =>
        prevCars
          .map(car => {
            const lane = LANES.find(l => l.id === car.laneId);
            const pos = getPos(lane.path, car.progress);
            let stop = false;
            lights
              .filter(l => l.laneId === car.laneId)
              .forEach(lt => {
                const d = Math.hypot(pos.x - lt.x, pos.y - lt.y);
                if (d < 20 && lt.state === 'red') stop = true;
              });
            const ahead = prevCars.find(
              o => o.laneId === car.laneId && o.progress > car.progress && o.progress - car.progress < 0.05
            );
            if (stop || ahead) return car;
            const np = car.progress + car.speed;
            if (np > 1) return null;   // dispariție la capăt
            return { ...car, progress: np };
          })
          .filter(c => c)
      );
    }, 16);
    return () => clearInterval(iv);
  }, [lights]);

  // Ștergerea semaforului la click stânga
  const removeLight = id => setLights(prev => prev.filter(l => l.id !== id));

  // Plasarea semaforului pe canvas
  const handleCanvasClick = e => {
    if (!placingDir) return;
    const { offsetX: x, offsetY: y } = e.evt;
    setLights(prev => [
      ...prev,
      { id: 'L' + Date.now(), laneId: placingDir, x, y, state: 'red', remaining: config[placingDir].red }
    ]);
    setPlacingDir(null);
  };

  return (
    <div className="app">
      {/* Toolbar semafoare */}
      <div className="toolbar">
        <h2>Semafoare</h2>
        {LANES.map(lane => (
          <div key={lane.id} className="tool-block">
            <h4>Direcție {lane.id}</h4>
            <label>
              Verde (ms):
              <input
                type="number"
                value={config[lane.id].green}
                onChange={e =>
                  setConfig(c => ({
                    ...c,
                    [lane.id]: { ...c[lane.id], green: +e.target.value }
                  }))
                }
              />
            </label>
            <label>
              Roșu (ms):
              <input
                type="number"
                value={config[lane.id].red}
                onChange={e =>
                  setConfig(c => ({
                    ...c,
                    [lane.id]: { ...c[lane.id], red: +e.target.value }
                  }))
                }
              />
            </label>
            <button
              onClick={() => setPlacingDir(lane.id)}
              className={placingDir === lane.id ? 'active' : ''}
            >
              {placingDir === lane.id ? 'Click pe hartă…' : 'Adaugă semafor'}
            </button>
          </div>
        ))}
      </div>

      {/* Canvas intersecție */}
      <div className="canvas-container">
        <Stage width={WIDTH} height={HEIGHT} onClick={handleCanvasClick}>
          <Layer>
            {/* Drumuri */}
            <Rect x={0} y={CENTER_Y - ROAD_WIDTH / 2} width={WIDTH} height={ROAD_WIDTH} fill="#333" />
            <Rect
              x={CENTER_X - ROAD_WIDTH / 2}
              y={0}
              width={ROAD_WIDTH}
              height={HEIGHT}
              fill="#333"
            />
            {/* Marcaje (discontinuu → continuu → discontinuu) */}
            {[
              [[0, CENTER_Y], [200, CENTER_Y], DASH],
              [[200, CENTER_Y], [600, CENTER_Y], []],
              [[600, CENTER_Y], [WIDTH, CENTER_Y], DASH],
              [[CENTER_X, 0], [CENTER_X, 200], DASH],
              [[CENTER_X, 200], [CENTER_X, 400], []],
              [[CENTER_X, 400], [CENTER_X, HEIGHT], DASH]
            ].map((seg, i) => (
              <Line
                key={i}
                points={[...seg[0], ...seg[1]]}
                stroke="#fff"
                strokeWidth={2}
                dash={seg[2]}
              />
            ))}

            {/* Zone invizibile pentru adăugare mașini */}
            {LANES.map(lane => (
              <Line
                key={lane.id}
                points={lane.path}
                strokeWidth={ROAD_WIDTH / 2}
                stroke="transparent"
                onClick={() => addCar(lane.id)}
              />
            ))}

            {/* Semafoare */}
            {lights.map(light => (
              <Group
                key={light.id}
                x={light.x}
                y={light.y}
                onClick={e => {
                  e.cancelBubble = true;
                  removeLight(light.id);
                }}
              >
                <Rect width={16} height={24} offset={{ x: 8, y: 12 }} fill="#222" cornerRadius={4} />
                <Circle
                  y={-6}
                  radius={6}
                  fill={light.state === 'green' ? '#0f0' : '#f00'}
                  stroke="#000"
                  strokeWidth={1}
                />
              </Group>
            ))}

            {/* Mașini */}
            {cars.map(car => {
              const lane = LANES.find(l => l.id === car.laneId);
              const pos = getPos(lane.path, car.progress);
              if (!pos) return null;
              return (
                <Group
                  key={car.id}
                  x={pos.x}
                  y={pos.y}
                  rotation={(pos.angle * 180) / Math.PI}
                >
                  {/* Caroserie */}
                  <Rect
                    width={24}
                    height={12}
                    offset={{ x: 12, y: 6 }}
                    fill={car.color}
                    cornerRadius={2}
                  />
                  {/* Parbriz */}
                  <Rect
                    width={8}
                    height={4}
                    offset={{ x: 16, y: 3 }}
                    fill="#fff"
                    cornerRadius={1}
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>

      {/* Panou flux vehicule/minut */}
      <div className="flux-panel">
        <h2>Flux vehicule/min</h2>
        {LANES.map(lane => (
          <div key={lane.id} className="flux-block">
            <label>
              {lane.id}: {config[lane.id].flow} veh/min
            </label>
            <input
              type="range"
              min="1"
              max="60"
              value={config[lane.id].flow}
              onChange={e =>
                setConfig(c => ({
                  ...c,
                  [lane.id]: { ...c[lane.id], flow: +e.target.value }
                }))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
