
// Skibidi Traffic - Road with Separate In/Out Lane Controls and Center Line

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let placedElements = [];
let draggedElement = null;
let isPlacing = false;
let selectedIntersection = null;
let groupCounter = 1;

let isDraggingGroup = false;
let dragOffset = { x: 0, y: 0 };

let isDraggingRoad = false;
let activeConnection = null;
let roads = [];
let selectedRoad = null;
const LANE_WIDTH = 20;

const laneControls = document.createElement("div");
laneControls.style.position = "absolute";
laneControls.style.display = "none";
laneControls.style.gap = "4px";
laneControls.style.zIndex = "1000";
laneControls.style.flexDirection = "column";
laneControls.style.background = "white";
laneControls.style.padding = "4px";
laneControls.style.border = "1px solid black";

document.body.appendChild(laneControls);

let currentLaneAction = null;

function showInOutButtons(action) {
    // curăță vechile in/out
    const existing = laneControls.querySelectorAll(".inout");
    existing.forEach(el => el.remove());
  
    const inBtn = document.createElement("button");
    inBtn.textContent = "in";
    inBtn.className = "inout";
    inBtn.onclick = () => {
      if (!selectedRoad) return;
      if (action === "add") {
        selectedRoad.lanesIn += 1;
      } else if (action === "remove" && selectedRoad.lanesIn > 0) {
        selectedRoad.lanesIn -= 1;
      }
      updateRoadWidth();
    };
  
    const outBtn = document.createElement("button");
    outBtn.textContent = "out";
    outBtn.className = "inout";
    outBtn.onclick = () => {
      if (!selectedRoad) return;
      if (action === "add") {
        selectedRoad.lanesOut += 1;
      } else if (action === "remove" && selectedRoad.lanesOut > 0) {
        selectedRoad.lanesOut -= 1;
      }
      updateRoadWidth();
    };
  
    laneControls.appendChild(inBtn);
    laneControls.appendChild(outBtn);
  }
  

function createControlButtons() {
  laneControls.innerHTML = "";

  const plus = document.createElement("button");
  plus.textContent = "+";
  plus.onclick = () => showInOutButtons("add");

  const minus = document.createElement("button");
  minus.textContent = "-";
  minus.onclick = () => showInOutButtons("remove");

  laneControls.appendChild(plus);
  laneControls.appendChild(minus);
}



function createRoadCross(x = 0, y = 0) {
  return {
    id: `cross-${Date.now()}`,
    type: 'road_cross',
    x,
    y,
    angle: 0,
    size: 40,
    widths: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40
    },
    // width: 40,
    groupId: groupCounter++
  };
}

// function updateRoadWidth() {
//   selectedRoad.width = (selectedRoad.lanesIn + selectedRoad.lanesOut) * LANE_WIDTH;
//   redraw();
//   positionLaneControls(selectedRoad);
// }



// function updateRoadWidth() {
//     selectedRoad.width = (selectedRoad.lanesIn + selectedRoad.lanesOut) * LANE_WIDTH;
  
//     // Extinde latura intersecției asociate (și pe cea opusă)
//     const intersection = placedElements.find(el => el.id === selectedRoad.from);
//     if (!intersection || !intersection.widths) return;
  
//     const side = selectedRoad.side;
//     const opposite = {
//       top: 'bottom',
//       bottom: 'top',
//       left: 'right',
//       right: 'left'
//     }[side];
  
//     const newWidth = selectedRoad.width;
  
//     // Extinde doar dacă latura e mai mică decât lățimea necesară
//     if (intersection.widths[side] < newWidth) {
//       intersection.widths[side] = newWidth;
//     }
  
//     if (intersection.widths[opposite] < newWidth) {
//       intersection.widths[opposite] = newWidth;
//     }
  
//     redraw();
//     positionLaneControls(selectedRoad);
//   }
  

function updateRoadWidth() {
    selectedRoad.width = (selectedRoad.lanesIn + selectedRoad.lanesOut) * LANE_WIDTH;
  
    const intersection = placedElements.find(el => el.id === selectedRoad.from);
    if (!intersection || !intersection.widths) return;
  
    const side = selectedRoad.side;
    const opposite = {
      top: 'bottom',
      bottom: 'top',
      left: 'right',
      right: 'left'
    }[side];
  
    const newWidth = selectedRoad.width;
    const isVertical = side === "top" || side === "bottom";
  
    const prevMax = Math.max(intersection.widths[side], intersection.widths[opposite]);
    const delta = newWidth - prevMax;
  
    if (delta > 0) {
      intersection.widths[side] = newWidth;
      intersection.widths[opposite] = newWidth;
  
      // repoziționare intersecție ca să rămână centrată
      if (isVertical) {
        intersection.y += side === "top" ? -delta / 2 : delta / 2;
      } else {
        intersection.x += side === "left" ? -delta / 2 : delta / 2;
      }
  
      // repoziționare drumuri atașate la intersecție
      for (const road of roads) {
        if (road.from === intersection.id) {
          if (road.side === "top") road.y = intersection.y - intersection.widths.top / 2;
          if (road.side === "bottom") road.y = intersection.y + intersection.widths.bottom / 2;
          if (road.side === "left") road.x = intersection.x - intersection.widths.left / 2;
          if (road.side === "right") road.x = intersection.x + intersection.widths.right / 2;
        }
      }
    }
  
    redraw();
    positionLaneControls(selectedRoad);
  }
  

const crossButton = document.querySelector('[data-type="road_cross"]');
crossButton.addEventListener('click', () => {
  draggedElement = createRoadCross();
  isPlacing = true;
});

canvas.addEventListener('mousedown', e => {
  const { x, y } = getMousePos(e);
  selectedRoad = null;
  laneControls.style.display = "none";

  for (const r of roads) {
    const dx = x - r.x;
    const dy = y - r.y;
    const angleRad = r.angle * Math.PI / 180;
    const localX = dx * Math.cos(-angleRad) - dy * Math.sin(-angleRad);
    const localY = dx * Math.sin(-angleRad) + dy * Math.cos(-angleRad);
    if (localX >= 0 && localX <= r.length && localY >= -r.width / 2 && localY <= r.width / 2) {
      selectedRoad = r;
      positionLaneControls(r);
      createControlButtons();
      redraw();
      return;
    }
  }

  for (let i = placedElements.length - 1; i >= 0; i--) {
    const elem = placedElements[i];
    const half = elem.size / 2;
    if (x >= elem.x - half && x <= elem.x + half && y >= elem.y - half && y <= elem.y + half) {
      selectedIntersection = elem;
      isDraggingGroup = true;
      dragOffset.x = x - elem.x;
      dragOffset.y = y - elem.y;
      return;
    }
  }

//   if (selectedIntersection) {
//     //const half = selectedIntersection.size / 2;

//     const halfT = (selectedIntersection.widths?.top || 40) / 2;
//     const halfB = (selectedIntersection.widths?.bottom || 40) / 2;
//     const halfL = (selectedIntersection.widths?.left || 40) / 2;
//     const halfR = (selectedIntersection.widths?.right || 40) / 2;

//     const directions = [
//     //   { side: 'top', x: selectedIntersection.x, y: selectedIntersection.y - half, angle: 270 },
//     //   { side: 'right', x: selectedIntersection.x + half, y: selectedIntersection.y, angle: 0 },
//     //   { side: 'bottom', x: selectedIntersection.x, y: selectedIntersection.y + half, angle: 90 },
//     //   { side: 'left', x: selectedIntersection.x - half, y: selectedIntersection.y, angle: 180 }
//         { side: 'top', x: selectedIntersection.x, y: selectedIntersection.y - halfT, angle: 270 },
//         { side: 'bottom', x: selectedIntersection.x, y: selectedIntersection.y + halfB, angle: 90 },
//         { side: 'left', x: selectedIntersection.x - halfL, y: selectedIntersection.y, angle: 180 },
//         { side: 'right', x: selectedIntersection.x + halfR, y: selectedIntersection.y, angle: 0 },

//     ];

//     for (const dir of directions) {
//       if (distance(x, y, dir.x, dir.y) <= 6) {
//         const newRoad = {
//           x: dir.x,
//           y: dir.y,
//           angle: dir.angle,
//           lanesIn: 1,
//           lanesOut: 1,
//           width: 2 * LANE_WIDTH,
//           length: 1,
//           from: selectedIntersection.id,
//           groupId: selectedIntersection.groupId,
//           side: dir.side
//         };
//         roads.push(newRoad);
//         activeConnection = newRoad;
//         isDraggingRoad = true;
//         return;
//       }
//     }
//   }

if (selectedIntersection) {
    const halfT = (selectedIntersection.widths?.top || 40) / 2;
    const halfB = (selectedIntersection.widths?.bottom || 40) / 2;
    const halfL = (selectedIntersection.widths?.left || 40) / 2;
    const halfR = (selectedIntersection.widths?.right || 40) / 2;
  
    const directions = [
      { side: 'top', x: selectedIntersection.x, y: selectedIntersection.y - halfT, angle: 270 },
      { side: 'bottom', x: selectedIntersection.x, y: selectedIntersection.y + halfB, angle: 90 },
      { side: 'left', x: selectedIntersection.x - halfL, y: selectedIntersection.y, angle: 180 },
      { side: 'right', x: selectedIntersection.x + halfR, y: selectedIntersection.y, angle: 0 }
    ];
  
    for (const dir of directions) {
      if (distance(x, y, dir.x, dir.y) <= 6) {
        const newRoad = {
          x: dir.x,
          y: dir.y,
          angle: dir.angle,
          lanesIn: 1,
          lanesOut: 1,
          width: 2 * LANE_WIDTH,
          length: 1,
          from: selectedIntersection.id,
          groupId: selectedIntersection.groupId,
          side: dir.side
        };
        roads.push(newRoad);
        activeConnection = newRoad;
        isDraggingRoad = true;
        return;
      }
    }
  }
});

function positionLaneControls(road) {
  const rect = canvas.getBoundingClientRect();
  const cx = road.x + (road.length / 2) * Math.cos(road.angle * Math.PI / 180);
  const cy = road.y + (road.length / 2) * Math.sin(road.angle * Math.PI / 180);
  laneControls.style.left = rect.left + cx + 10 + 'px';
  laneControls.style.top = rect.top + cy - 10 + 'px';
  laneControls.style.display = 'flex';
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const r of roads) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.angle * Math.PI / 180);
  
    const totalWidth = (r.lanesIn + r.lanesOut) * LANE_WIDTH;
    const centerOffset = r.lanesIn * LANE_WIDTH;
  
    // desen drum gri
    ctx.fillStyle = 'gray';
    ctx.fillRect(0, -centerOffset, r.length, totalWidth);
  
    // linie albă continuă pe mijloc
    ctx.strokeStyle = 'white';
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r.length, 0);
    ctx.stroke();
  
    // marcaje punctate între benzi (opțional)
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
  
    for (let i = 1; i < r.lanesIn; i++) {
      const y = -centerOffset + i * LANE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(r.length, y);
      ctx.stroke();
    }
  
    for (let i = 1; i < r.lanesOut; i++) {
      const y = i * LANE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(r.length, y);
      ctx.stroke();
    }
  
    ctx.setLineDash([]);
    ctx.restore();
  }
  


  

  const allElements = [...placedElements];
  if (draggedElement) allElements.push(draggedElement);

//   for (const elem of allElements) {
//     if (elem.type === 'road_cross') {
//       ctx.save();
//       ctx.translate(elem.x, elem.y);
//       ctx.rotate((elem.angle || 0) * Math.PI / 180);
//     //   const half = elem.size / 2;
//     //   ctx.fillStyle = 'gray';
//     //   ctx.fillRect(-half, -half, elem.size, elem.size);

//         const top = elem.widths?.top || elem.size;
//         const bottom = elem.widths?.bottom || elem.size;
//         const left = elem.widths?.left || elem.size;
//         const right = elem.widths?.right || elem.size;

//         const halfH = Math.max(top, bottom) / 2;
//         const halfW = Math.max(left, right) / 2;

//         // const points = [
//         //     { x: elem.x, y: elem.y - top / 2 },
//         //     { x: elem.x + right / 2, y: elem.y },
//         //     { x: elem.x, y: elem.y + bottom / 2 },
//         //     { x: elem.x - left / 2, y: elem.y }
//         //   ];

//         ctx.fillStyle = 'gray';
//         ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);

        





//       ctx.restore();

//     //   if (elem === selectedIntersection) {
//     //     const points = [
//     //       { x: elem.x, y: elem.y - half },
//     //       { x: elem.x + half, y: elem.y },
//     //       { x: elem.x, y: elem.y + half },
//     //       { x: elem.x - half, y: elem.y }
//     //     ];
//     //     ctx.fillStyle = 'rgba(0, 150, 255, 0.8)';
//     //     for (const p of points) {
//     //       ctx.beginPath();
//     //       ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
//     //       ctx.fill();
//     //     }
//     //   }

//     if (elem === selectedIntersection) {
//         const top = elem.widths?.top || elem.size;
//         const bottom = elem.widths?.bottom || elem.size;
//         const left = elem.widths?.left || elem.size;
//         const right = elem.widths?.right || elem.size;
      
//         const points = [
//           { x: elem.x, y: elem.y - top / 2 },
//           { x: elem.x + right / 2, y: elem.y },
//           { x: elem.x, y: elem.y + bottom / 2 },
//           { x: elem.x - left / 2, y: elem.y }
//         ];
        
//         ctx.fillStyle = 'rgba(0, 150, 255, 0.8)';
//         for (const p of points) {
//           ctx.beginPath();
//           ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
//           ctx.fill();
//         }
//       }
      
//     }
//   }


for (const elem of allElements) {
    if (elem.type === 'road_cross') {
      ctx.save();
      ctx.translate(elem.x, elem.y);
      ctx.rotate((elem.angle || 0) * Math.PI / 180);
  
      const top = elem.widths?.top || elem.size;
      const bottom = elem.widths?.bottom || elem.size;
      const left = elem.widths?.left || elem.size;
      const right = elem.widths?.right || elem.size;
  
      const halfH = Math.max(top, bottom) / 2;
      const halfW = Math.max(left, right) / 2;
  
      ctx.fillStyle = 'gray';
      ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);
  
      ctx.restore();
  
      if (elem === selectedIntersection) {
        const points = [
          { x: elem.x, y: elem.y - top / 2 },
          { x: elem.x + right / 2, y: elem.y },
          { x: elem.x, y: elem.y + bottom / 2 },
          { x: elem.x - left / 2, y: elem.y }
        ];
        ctx.fillStyle = 'rgba(0, 150, 255, 0.8)';
        for (const p of points) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
  }
}

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (isPlacing && draggedElement) {
    draggedElement.x = mouseX;
    draggedElement.y = mouseY;
    redraw();
    return;
  }

  if (isDraggingGroup && selectedIntersection) {
    const dx = mouseX - dragOffset.x;
    const dy = mouseY - dragOffset.y;
    const deltaX = dx - selectedIntersection.x;
    const deltaY = dy - selectedIntersection.y;
    selectedIntersection.x += deltaX;
    selectedIntersection.y += deltaY;

    for (const road of roads) {
      if (road.groupId === selectedIntersection.groupId) {
        road.x += deltaX;
        road.y += deltaY;
      }
    }
    redraw();
    return;
  }

  if (isDraggingRoad && activeConnection) {
    const angleRad = activeConnection.angle * Math.PI / 180;
    const dx = mouseX - activeConnection.x;
    const dy = mouseY - activeConnection.y;
    const projected = dx * Math.cos(angleRad) + dy * Math.sin(angleRad);
    activeConnection.length = Math.max(30, projected);
    redraw();
    return;
  }
});

canvas.addEventListener('mouseup', () => {
  isDraggingGroup = false;
  isDraggingRoad = false;
  activeConnection = null;
});

canvas.addEventListener('click', e => {
  const { x, y } = getMousePos(e);

  if (isPlacing && draggedElement) {
    placedElements.push({ ...draggedElement });
    selectedIntersection = draggedElement;
    draggedElement = null;
    isPlacing = false;
    redraw();
    return;
  }

  selectedIntersection = null;
  for (const elem of placedElements) {
    const half = elem.size / 2;
    if (x >= elem.x - half && x <= elem.x + half && y >= elem.y - half && y <= elem.y + half) {
      selectedIntersection = elem;
      break;
    }
  }

  redraw();
});

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
