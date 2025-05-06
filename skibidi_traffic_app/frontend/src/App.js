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

// Configurare drumuri și benzi
const LANES = [
  { id: 'E', path: [0, CENTER_Y + LANE_OFFSET, WIDTH, CENTER_Y + LANE_OFFSET] },
  { id: 'W', path: [WIDTH, CENTER_Y - LANE_OFFSET, 0, CENTER_Y - LANE_OFFSET] },
  { id: 'S', path: [CENTER_X - LANE_OFFSET, 0, CENTER_X - LANE_OFFSET, HEIGHT] },
  { id: 'N', path: [CENTER_X + LANE_OFFSET, HEIGHT, CENTER_X + LANE_OFFSET, 0] }
];

const PRIORITY_MAP = { //pentru prioritate dreapta
  N: 'W', 
  E: 'N',  
  S: 'E',  
  W: 'S'   
};

const STOP_OFFSET = 20; 
const STOP_POSITIONS = { // coordonatele unde se plaseaza semafoarele
  E: {
    x: CENTER_X - ROAD_WIDTH/2 - STOP_OFFSET,   
    y: CENTER_Y + LANE_OFFSET
  },
  W: {
    x: CENTER_X + ROAD_WIDTH/2 + STOP_OFFSET,   
    y: CENTER_Y - LANE_OFFSET
  },
  S: {
    x: CENTER_X - LANE_OFFSET,               
    y: CENTER_Y - ROAD_WIDTH/2 - STOP_OFFSET
  },
  N: {
    x: CENTER_X + LANE_OFFSET,                
    y: CENTER_Y + ROAD_WIDTH/2 + STOP_OFFSET
  }
};




function getPos(points, prog) {
  if (prog>1) return null;
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
//configurarea initiala semafoarelor
  const initialConfig = LANES.reduce((acc, lane) => {
    acc[lane.id] = { green: 5000, red: 5000, flow: 5 };
    return acc;
  }, {});
  const [config, setConfig] = useState(initialConfig);

  const [lights, setLights] = useState([]);       
  const [cars, setCars]     = useState([]);      
  const [placingDir, setPlacingDir] = useState(null); 
  const [passedCount, setPassedCount] = useState(0);
  useEffect(() => {
    localStorage.setItem('passedCount', '0');
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      setPassedCount(parseInt(localStorage.getItem('passedCount') || '0', 10));
    }, 500);
    return () => clearInterval(id);
  }, []);


  // generare masini la intervalul setat de user
  useEffect(() => {
    const intervals = LANES.map(lane => {
      const ms = 60000 / config[lane.id].flow;
      return setInterval(() => addCar(lane.id), ms);
    });
    return () => intervals.forEach(clearInterval);
  }, [config]);

  //functia de adaugare masini
  const addCar = laneId => {
    const color = '#' + Math.floor(Math.random() * 16777215).toString(16);
    setCars(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        laneId,
        progress: 0,
        speed: 0.002 + Math.random() * 0.002,
        color,
        waitTime: 0
      }
    ]);
  };

  //animatia semaforului
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

//animatii pentru masini
  useEffect(() => {
    const STEP = 16;
    const interval = setInterval(() => {
      setCars(prevCars =>
        prevCars.map(car => {
          const lane = LANES.find(l => l.id === car.laneId);
          const cur = car.progress;
          const next = cur + car.speed;
          const curPos = getPos(lane.path, cur);
          const nextPos = getPos(lane.path, next);
          if (!curPos || !nextPos) return null;

          //zonele de intersecție
          const APPROACH_ZONE = 0.35;
          const INTERSECTION_START = 0.4;
          const INTERSECTION_END = 0.65;
          const EXIT_ZONE = 0.85;
          if (cur < EXIT_ZONE && next >= EXIT_ZONE) {
                const prev = parseInt(localStorage.getItem('passedCount') || '0', 10);
                localStorage.setItem('passedCount', (prev + 1).toString());
              }
          //daca ai iesit din intersecție, du-te mai departe
          if (cur >= EXIT_ZONE) {
            return next > 1
              ? null
              : { ...car, progress: next, waitTime: 0 };
          }

          let stop = false;
          const light = lights.find(l => l.laneId === car.laneId);
          const hasLight = Boolean(light);
          const isRed = hasLight && light.state === 'red';
          const nearLight =
            hasLight &&
            Math.hypot(nextPos.x - light.x, nextPos.y - light.y) < 20;

          //1)rosu la semafor
          if (isRed && nearLight) {
            stop = true;
          }

           //2) verificare intersecție
          const entering = cur < INTERSECTION_START && next >= INTERSECTION_START;
          const inApproach = cur >= APPROACH_ZONE && cur < INTERSECTION_START;
          const rightLane = PRIORITY_MAP[car.laneId];

          // 3) Vehicule CU semafor verde: verificare continuă de prioritate de dreapta și eliberare intersecție
          if (hasLight && light.state === 'green' && (inApproach || entering)) {
            // A) vehicule semaforizate cu verde pe dreapta
            const rightGreen = prevCars.some(o => {
              const sl = lights.find(l => l.laneId === o.laneId);
              return (
                o.laneId === rightLane &&
                sl?.state === 'green' &&
                ((o.progress > APPROACH_ZONE && o.progress < INTERSECTION_END) ||
                  (o.progress >= INTERSECTION_END && o.progress < EXIT_ZONE))
              );
            });
            // B) vehicule fără semafor deja în intersecție
            const nonPriorityInInt = prevCars.some(o =>
              !lights.some(l => l.laneId === o.laneId) &&
              o.progress > INTERSECTION_START &&
              o.progress < INTERSECTION_END
            );
            if (rightGreen || nonPriorityInInt) {
              stop = true;
            }
          }

          // 4) Vehicule FĂRĂ semafor: blochează cât timp există semafor verde, apoi dreptul de dreapta
          if (!hasLight && inApproach) {
            const anyGreen = prevCars.some(o => {
              const sl = lights.find(l => l.laneId === o.laneId);
              return (
                sl?.state === 'green' &&
                ((o.progress > INTERSECTION_START && o.progress < INTERSECTION_END) ||
                  (o.progress >= INTERSECTION_END && o.progress < EXIT_ZONE))
              );
            });
            if (anyGreen) {
              stop = true;
            } else {
              const rightNoLight = prevCars.some(o =>
                o.laneId === rightLane &&
                !lights.some(l => l.laneId === o.laneId) &&
                o.progress >= APPROACH_ZONE &&
                o.progress < INTERSECTION_END
              );
              if (rightNoLight) {
                stop = true;
              }
            }
          }

          // 5) Coliziune cu vehicul din față
          const ahead = prevCars.find(
            o => o.laneId === car.laneId && o.progress > cur && o.progress - cur < 0.05
          );
          if (ahead) {
            stop = true;
          }

          // 6) Decizie finală
          if (stop) {
            const newWait = car.waitTime + STEP;
            if (hasLight) {
              // doar semaforizatele pot forța trecerea după 2s
              if (newWait > 2000) {
                return { ...car, progress: next, waitTime: 0 };
              }
              return { ...car, waitTime: newWait };
            }
            // non-semafor: rămâi blocat
            return { ...car, waitTime: newWait };
          }

          // dacă nu se oprește, avansează
          return next > 1
            ? null
            : { ...car, progress: next, waitTime: 0 };
        }).filter(Boolean)
      );
    }, STEP);
    return () => clearInterval(interval);
  }, [lights]);
  
  // Ștergerea semaforului la click stânga
  const removeLight = id => setLights(prev => prev.filter(l => l.id !== id));

  const handleCanvasClick = () => {
    if (!placingDir) return;
    const { x, y } = STOP_POSITIONS[placingDir];
    setLights(prev => [
      ...prev,
      {
        id: 'L' + Date.now(),
        laneId: placingDir,
        x, y,
        state: 'red',
        remaining: config[placingDir].red
      }
    ]);
    setPlacingDir(null);
  };
  

  return (
    <div className="app" style={{ position: 'relative' }}>
      {/*Toolbar semafoare*/}
      <div style={{ position: 'absolute', top: 10, left: 350, zIndex: 1000, background: '#4e4e4e', color:'#ccc',padding: '5px 10px', borderRadius: '4px', boxShadow: '0 0 5px rgba(0,0,0,0.3)' }}>
        Mașini trecute: {passedCount}
      </div>
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

      {/*Desenare intersectie*/}
      <div className="canvas-container">
        <Stage width={WIDTH} height={HEIGHT} onClick={handleCanvasClick}>
          <Layer>
            {/* Drumuri */}
            <Rect x={0} y={CENTER_Y - ROAD_WIDTH / 2} width={WIDTH} height={ROAD_WIDTH} fill="#444" />
            <Rect
              x={CENTER_X - ROAD_WIDTH / 2}
              y={0}
              width={ROAD_WIDTH}
              height={HEIGHT}
              fill="#444"
            />
            
            {/* Marcaje simple: linii centrale orizontală și verticală */}
<Line
  points={[0, CENTER_Y, WIDTH, CENTER_Y]}
  stroke="#fff"
  strokeWidth={4}
/>
<Line
  points={[CENTER_X, 0, CENTER_X, HEIGHT]}
  stroke="#fff"
  strokeWidth={4}
/>


            {/*Zona unde se spawnneaza masinile*/}
            {LANES.map(lane => (
              <Line
                key={lane.id}
                points={lane.path}
                strokeWidth={ROAD_WIDTH / 2}
                stroke="transparent"
                onClick={() => addCar(lane.id)}
              />
            ))}

            {/*Semafoare*/}
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

            {/* Masini*/}
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
                  {/* Caroserie*/}
                  <Rect
                    width={24}
                    height={12}
                    offset={{ x: 12, y: 6 }}
                    fill={car.color}
                    cornerRadius={2}
                  />
                  {/* Tenativa parbriz */}
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

      {/* Setare flux vehicule/minut */}
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
              max="20"
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