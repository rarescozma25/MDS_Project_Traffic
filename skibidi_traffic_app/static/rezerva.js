
        function showSidebar(){
            const sidebar = document.querySelector('.sidebar')
            sidebar.style.display = 'flex'
        }

        function hideSidebar(){
            const sidebar = document.querySelector('.sidebar')
            sidebar.style.display = 'none'
        }
    
        const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const slider = document.getElementById('rotationSlider');
let placedElements = [];
let draggedElement = null;
let isPlacing = false;
let groupCounter = 1;
let snapPoints = [];
let selectedElement = null;
let isDraggingSelected = false;
let dragOffset = { x: 0, y: 0 };

//Dima:pt largire drum:
let selectedRoad = null;



canvas.addEventListener('mousedown', e => {
  if (selectedElement) {
    const rect = canvas.getBoundingClientRect();
    const pos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    if (isPointOnElement(pos, selectedElement)) {
      isDraggingSelected = true;
      isPlacing = true;

      // Convertim elementul selectat într-un "draggedElement" temporar
      draggedElement = { ...selectedElement };
      dragOffset.x = pos.x - selectedElement.x;
      dragOffset.y = pos.y - selectedElement.y;

      // Eliminăm temporar din lista de elemente
      placedElements = placedElements.filter(e => e !== selectedElement);
      selectedElement = null;
    }
  }
});



canvas.addEventListener('mouseup', e => {
  if (draggedElement && isDraggingSelected) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const snap = snapToPointIfClose(mouseX, mouseY, draggedElement);
    if (snap) {
      draggedElement.x = snap.x;
      draggedElement.y = snap.y;
      draggedElement.angle = snap.angle;
      draggedElement.groupId = snap.groupId;
    }

    placedElements.push(draggedElement);
    selectedElement = draggedElement;
    draggedElement = null;
    isDraggingSelected = false;
    isPlacing = false;
    redraw();
  }
});



document.querySelectorAll('.item').forEach(item => {
  item.addEventListener('click', () => {
    const type = item.dataset.type;

    let angle = 0;
    const sliderAngle = parseInt(slider.value);

    if (type === 'road_curve') {
      const dir = document.getElementById("curveDirection").value;
      switch (dir) {
        case "right": angle = 0; break;
        case "left": angle = 90; break;
      }

      // ➕ adaugă și unghiul fin de rotație
      angle = (angle + sliderAngle) % 360;
    } else {
      // pentru celelalte tipuri de drumuri
      angle = sliderAngle;
    }

    draggedElement = {
      type,
      x: 0,
      y: 0,
      angle: angle,
      width: 40,
      length: 100,
      radius: 50,
      size: 100,
      exitCount: parseInt(document.getElementById("exitCount")?.value || "4"),
      groupId: groupCounter++
    };

    isPlacing = true;
  });
});


canvas.addEventListener('mousemove', e => {
  if (isPlacing && draggedElement) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const angle = parseInt(slider.value);
    const angleRad = angle * Math.PI / 180;

    if (draggedElement.type === 'road_curve') {
      // Calculăm centrul cercului astfel încât mijlocul curbei să fie sub cursor
      const midAngleRad = angleRad + Math.PI / 4;  // 45° în radiani
      draggedElement.x = mouseX - draggedElement.radius * Math.cos(midAngleRad);
      draggedElement.y = mouseY - draggedElement.radius * Math.sin(midAngleRad);
    }  else if (draggedElement.type === 'roundabout' || draggedElement.type === 'road_cross') {
      draggedElement.x = mouseX;
      draggedElement.y = mouseY;
    }else {
      // Mutăm astfel încât mijlocul drumului să fie sub cursor
      draggedElement.x = mouseX - (draggedElement.length / 2) * Math.cos(angleRad);
      draggedElement.y = mouseY - (draggedElement.length / 2) * Math.sin(angleRad);
    }

    draggedElement.angle = angle;
    redraw();
  }

  if (isDraggingSelected && selectedElement) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      selectedElement.x = mouseX - dragOffset.x;
      selectedElement.y = mouseY - dragOffset.y;

      redraw();
    }
});

// canvas.addEventListener('mouseup', () => {
//   isDraggingSelected = false;
  
// });





canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const pos = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };

  if (isPlacing && draggedElement) {
    const snap = snapToPointIfClose(pos.x, pos.y, draggedElement);
    if (snap) {
      draggedElement.x = snap.x;
      draggedElement.y = snap.y;
      draggedElement.angle = snap.angle;
      draggedElement.groupId = snap.groupId;

      // DIMA: Preluare număr de benzi dacă e legat de un drum drept existent
        const target = snap.snappedToElement;
        if (target?.type === 'road_straight' && draggedElement.type === 'road_straight') {
          draggedElement.width = target.width;
        }
    }

    placedElements.push(draggedElement);
    draggedElement = null;
    isPlacing = false;
    selectedElement = null;

    //Dima - pt largire
    selectedRoad = null;
    document.getElementById("laneControls").style.display = "none";
//----------------------------------------
    redraw();
    return;
  }

  if (selectElementAtPosition(pos)) return;


  // Dacă nu e nimic selectat, deselectăm
  selectedElement = null;
  redraw();



  redraw(); // deselectăm dacă am dat click pe gol
});


slider.addEventListener('input', () => {
  if (draggedElement) {
    draggedElement.angle = parseInt(slider.value);
    redraw();
  }
  if (selectedElement) {
    selectedElement.angle = parseInt(slider.value);
    redraw();
  }
});



function snapToPointIfClose(mouseX, mouseY, elem) {
  for (const sp of snapPoints) {
    const dist = distance({ x: mouseX, y: mouseY }, sp);
    if (dist < 15) {
      let angle = sp.angle;
      let finalAngle = angle;
      let x, y;

      // dacă ne atașăm la capătul de START, inversăm direcția (rotim cu 180°)
      if (sp.isStart) {
        finalAngle = (angle + 180) % 360;
      }

      const angleRad = finalAngle * Math.PI / 180;

      if (elem.type === 'road_straight') {
        x = sp.x;
        y = sp.y;

      // } else if (elem.type === 'road_curve') {
      //   const backAngle = (finalAngle + 90) * Math.PI / 180;
      //   x = sp.x - elem.radius * Math.cos(backAngle);
      //   y = sp.y - elem.radius * Math.sin(backAngle);
      // }
      } else if (elem.type === 'road_curve') {
        const curveDir = document.getElementById("curveDirection").value;
        let attachStart = true;

        if (!sp.isStart) {
          // Legăm la END POINT
          if (curveDir === 'right') {
            attachStart = true; // atașăm STARTUL curbei
          } else if (curveDir === 'left') {
            attachStart = false; // atașăm SFÂRȘITUL curbei
          }

          // Setăm unghiul curbei în funcție de direcție
          if (curveDir === 'right') {
            finalAngle = (angle + 0) % 360;
          } else if (curveDir === 'left') {
            finalAngle = (angle + 270) % 360;
          }

        } else {
          // Legăm la START POINT
          if (curveDir === 'right') {
            attachStart = false; // atașăm SFÂRȘITUL curbei
          } else if (curveDir === 'left') {
            attachStart = true;  // atașăm STARTUL curbei
          }

          // UNGHIURI PENTRU CONECTARE ÎNAPOI
          if (curveDir === 'right') {
            finalAngle = (angle + 90) % 360;
          } else if (curveDir === 'left') {
            finalAngle = (angle + 180) % 360;
          }
        }


        // Calculăm poziția curbei astfel încât să se conecteze la punctul ales
        const radOffset = attachStart ? finalAngle + 90 : finalAngle;
        const rad = radOffset * Math.PI / 180;
        x = sp.x - elem.radius * Math.cos(rad);
        y = sp.y - elem.radius * Math.sin(rad);
      } else if (elem.type === 'road_cross') {
        return [
          { x: elem.x, y: elem.y - elem.size / 2, angle: 270, groupId: elem.groupId }, // sus
          { x: elem.x + elem.size / 2, y: elem.y, angle: 0, groupId: elem.groupId },   // dreapta
          { x: elem.x, y: elem.y + elem.size / 2, angle: 90, groupId: elem.groupId },  // jos
          { x: elem.x - elem.size / 2, y: elem.y, angle: 180, groupId: elem.groupId }  // stânga
        ];
      }

      return {
        x,
        y,
        angle: finalAngle,
        groupId: sp.groupId,
        //Dima
        snappedToElement: sp.sourceElement
      };
    }
  }
  return null;
}



function drawDashedLine(x, y, angle, length) {
  const rad = angle * Math.PI / 180;
  for (let i = 0; i < length; i += 20) {
    const x1 = x + i * Math.cos(rad);
    const y1 = y + i * Math.sin(rad);
    const x2 = x + (i + 10) * Math.cos(rad);
    const y2 = y + (i + 10) * Math.sin(rad);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function isPointOnElement(pos, elem) {
  const angleRad = elem.angle * Math.PI / 180;
  const dx = pos.x - elem.x;
  const dy = pos.y - elem.y;
  const localX = dx * Math.cos(-angleRad) - dy * Math.sin(-angleRad);
  const localY = dx * Math.sin(-angleRad) + dy * Math.cos(-angleRad);

  if (elem.type === 'road_straight') {
    return (
      localX >= 0 &&
      localX <= elem.length &&
      localY >= -elem.width / 2 &&
      localY <= elem.width / 2
    );
  }

  if (elem.type === 'road_curve') {
    const r = Math.sqrt(localX * localX + localY * localY);
    const theta = Math.atan2(localY, localX);
    return (
      r >= elem.radius - elem.width / 2 &&
      r <= elem.radius + elem.width / 2 &&
      theta >= 0 &&
      theta <= Math.PI / 2
    );
  }

  return false;
}


function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);  // Curăță canvas-ul
  snapPoints = [];  // Golim lista de puncte de snap

  // Adăugăm punctele de snap pentru fiecare element deja plasat
  for (const elem of placedElements) {
    const starts = getStartPoint(elem);
    const ends = getEndPoint(elem);

    const startArray = Array.isArray(starts) ? starts : [starts];
    const endArray = Array.isArray(ends) ? ends : [ends];

    //snapPoints.push(...startArray.map(p => ({ ...p, isStart: true })));
    //snapPoints.push(...endArray.map(p => ({ ...p, isStart: false })));

    snapPoints.push(...startArray.map(p => ({ ...p, isStart: true, sourceElement: elem })));
    snapPoints.push(...endArray.map(p => ({ ...p, isStart: false, sourceElement: elem })));


  }

  // Desenăm toate elementele (drumuri și drumul în proces de plasare)
  for (const elem of placedElements.concat(draggedElement ? [draggedElement] : [])) {
    ctx.save();
    ctx.translate(elem.x, elem.y);
    ctx.rotate(elem.angle * Math.PI / 180);

    if (elem.type === 'road_straight') {

      //Dima
      // Dacă e conectat la alt drum, caută un alt road_straight cu același groupId
      const connected = placedElements.find(e =>
      e !== elem &&
      e.type === 'road_straight' &&
      e.groupId === elem.groupId
      );

      // Dacă am găsit unul, copiem lățimea lui
      if (connected) {
        elem.width = connected.width;
      }
//-------------------------
      if (elem === selectedElement) {
        ctx.fillStyle = '#ff0'; // fundal galben pentru evidențiere
        ctx.fillRect(-2, -elem.width / 2 - 2, elem.length + 4, elem.width + 4);
      }
      ctx.fillStyle = isPlacing && elem === draggedElement ? 'lightgray' : 'gray';
      ctx.fillRect(0, -elem.width / 2, elem.length, elem.width);

      //Dima: latire drum:
      /*drawDashedLine(0, 0, 0, elem.length);*/
      const numLanes = elem.width / 20;
      const centerOffset = -(elem.width / 2) + 20;

      for (let i = 1; i < numLanes; i++) {
        const y =  centerOffset + i * 20 - 20;
        drawDashedLine(0, y, 0, elem.length);
      }
    }

    if (elem.type === 'road_curve') {
      if (elem === selectedElement) {
        ctx.beginPath();
        ctx.lineWidth = elem.width + 4;
        ctx.strokeStyle = '#ff0'; // contur galben pentru evidențiere
        ctx.arc(0, 0, elem.radius, 0, Math.PI / 2);
        ctx.stroke();
      }

      ctx.strokeStyle = isPlacing && elem === draggedElement ? 'lightgray' : 'gray';
      ctx.lineWidth = elem.width;
      ctx.beginPath();
      ctx.arc(0, 0, elem.radius, 0, Math.PI / 2);
      ctx.stroke();

      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, elem.radius, 0, Math.PI / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (elem.type === 'road_cross') {
      const size = elem.size || 100;
      const w = elem.width || 50;
      const half = size / 2;
      const r = w / 2; // raza pentru colțuri și centru

      // 1. Drum vertical (gri)
      ctx.fillStyle = isPlacing && elem === draggedElement ? 'lightgray' : 'gray';
      ctx.fillRect(-w / 2, -half, w, size);

      // 2. Drum orizontal (gri)
      ctx.fillRect(-half, -w / 2, size, w);

      // 3. Colțuri decupate (semicercuri albe)
      ctx.fillStyle = 'white';
      const arcs = [
        { x: -w / 2, y: -w / 2, start: 0, end: Math.PI / 2 },
        { x: w / 2, y: -w / 2, start: Math.PI / 2, end: Math.PI },
        { x: w / 2, y: w / 2, start: Math.PI, end: 3 * Math.PI / 2 },
        { x: -w / 2, y: w / 2, start: 3 * Math.PI / 2, end: 2 * Math.PI }
      ];
      for (const a of arcs) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(a.x, a.y, r, a.start, a.end);
        ctx.closePath();
        ctx.fill();
      }

      // 4. Centrul intersecției (acoperire)
      ctx.fillStyle = isPlacing && elem === draggedElement ? 'lightgray' : 'gray';
      ctx.fillRect(-r, -r, r * 2, r * 2);

      // 5. Marcaje albe (după ce centrul e desenat!)
      drawDashedLine(-half, 0, 0, size);   // linie albă orizontală
      drawDashedLine(0, -half, 90, size);  // linie albă verticală

      // 6. Evidențiere la selecție
      if (elem === selectedElement) {
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 3;
        ctx.strokeRect(-half - 5, -half - 5, size + 10, size + 10);
      }
    }

    if (elem.type === 'roundabout') {
      const r = elem.radius;

      // Cerc gri
      ctx.strokeStyle = isPlacing && elem === draggedElement ? 'lightgray' : 'gray';
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 2 * Math.PI);
      ctx.stroke();

      // Marcaj alb
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);

      // Snap points pe marginea cercului
      const exits = elem.exitCount || 4;
      const snapRadius = r + 10;
      for (let i = 0; i < exits; i++) {
        const angle = (2 * Math.PI * i) / exits;
        const x = elem.x + snapRadius * Math.cos(angle);
        const y = elem.y + snapRadius * Math.sin(angle);

        snapPoints.push({
          x,
          y,
          angle: (angle * 180 / Math.PI) % 360,
          groupId: elem.groupId,
          isStart: false,
          sourceElement: elem
        });

        if (isPlacing || isDraggingSelected) {
          ctx.beginPath();
          ctx.arc(x - elem.x, y - elem.y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(0, 150, 255, 0.5)';
          ctx.fill();
        }
      }

      // evidențiere
      if (elem === selectedElement) {
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 3;
        ctx.strokeRect(-r - 10, -r - 10, 2 * r + 20, 2 * r + 20);
      }
    }


    ctx.restore();
  }

  // Desenăm punctele albastre de snap
  if (isPlacing || isDraggingSelected) {
    for (const p of snapPoints) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 150, 255, 0.5)';
      ctx.fill();
    }
  }
}

function selectElementAtPosition(pos) {
  for (let i = placedElements.length - 1; i >= 0; i--) {
    const elem = placedElements[i];
    if (isPointOnElement(pos, elem)) {
      selectedElement = elem;
      slider.value = elem.angle;

      // DIMA - pt largire drum - Afișează controale doar dacă e un drum drept
      if (elem.type === 'road_straight') {
        selectedRoad = elem;
        positionLaneControls(elem);
      } else {
        selectedRoad = null;
        document.getElementById("laneControls").style.display = "none";
      }
      //---------------------------------------------------------------------

      redraw();
      return true;
    }
  }
  selectedElement = null;

  //Dima:
  selectedRoad = null;
  document.getElementById("laneControls").style.display = "none";
  //--------
  redraw();
  return false;
}

//Dima - pt largire drum - functie noua
function positionLaneControls(elem) {
  const rect = canvas.getBoundingClientRect();
  const elemCenter = {
    x: elem.x,
    y: elem.y - (elem.width / 2) - 20  // deasupra drumului
  };

  const angleRad = elem.angle * Math.PI / 180;
  const xRot = elemCenter.x * Math.cos(angleRad) - elemCenter.y * Math.sin(angleRad);
  const yRot = elemCenter.x * Math.sin(angleRad) + elemCenter.y * Math.cos(angleRad);

  const controls = document.getElementById("laneControls");
  controls.style.left = rect.left + elem.x +15+ "px";
  controls.style.top = rect.top + elem.y - elem.width / 2 - 30 + "px";
  controls.style.display = "flex";

  
}
//-----------------------------------

//functii noi - Dima
function increaseLanes() {
  if (selectedRoad) {
    selectedRoad.width += 20;
    redraw();
    positionLaneControls(selectedRoad);
  }
}

function decreaseLanes() {
  if (selectedRoad && selectedRoad.width > 20) {
    selectedRoad.width -= 20;
    redraw();
    positionLaneControls(selectedRoad);
  }
}
//-----------------------------------------------------------------

function getEndPoint(elem) {
  const rad = elem.angle * Math.PI / 180;
  if (elem.type === 'road_straight') {
    return {
      x: elem.x + elem.length * Math.cos(rad),
      y: elem.y + elem.length * Math.sin(rad),
      angle: elem.angle,
      groupId: elem.groupId
    };
  } else if (elem.type === 'road_curve') {
    return {
      x: elem.x + elem.radius * Math.cos(rad ),
      y: elem.y + elem.radius * Math.sin(rad ),
      angle: elem.angle + 90,
      groupId: elem.groupId
    };
  } else if (elem.type === 'road_cross') {
    const half = elem.size / 2;
    return [
      {
        x: elem.x + half,  // dreapta
        y: elem.y,
        angle: 0,
        groupId: elem.groupId
      },
      {
        x: elem.x,
        y: elem.y + half,  // jos
        angle: 90,
        groupId: elem.groupId
      }
    ];
  }
}

function getStartPoint(elem) {
  if (elem.type === 'road_straight') {
    return {
      x: elem.x,
      y: elem.y,
      angle: elem.angle,
      groupId: elem.groupId
    };
  } else if (elem.type === 'road_curve') {
    const rad = (elem.angle + 90) * Math.PI / 180;
    return {
      x: elem.x + elem.radius * Math.cos(rad),
      y: elem.y + elem.radius * Math.sin(rad),
      angle: elem.angle,
      groupId: elem.groupId
    };
  } else if (elem.type === 'road_cross') {
    const half = elem.size / 2;
    return [
      {
        x: elem.x - half,  // stânga
        y: elem.y,
        angle: 180,
        groupId: elem.groupId
      },
      {
        x: elem.x,
        y: elem.y - half,  // sus
        angle: 270,
        groupId: elem.groupId
      }
    ];
  }
}




function distance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}


function saveToJson() {
  const grouped = {};
  for (const elem of placedElements) {
    if (!grouped[elem.groupId]) grouped[elem.groupId] = [];
    grouped[elem.groupId].push(elem);
  }

  const data = {
    roads: Object.values(grouped).map(group => ({
      type: "road_group",
      parts: group.map(e => ({
        type: e.type,
        x: Math.round(e.x),
        y: Math.round(e.y),
        angle: Math.round(e.angle),
        length: e.length || null,
        radius: e.radius || null
      }))
    }))
  };

  console.log("📦 JSON:", data);
  document.getElementById('status').textContent = "✔ JSON în consolă (DevTools)";
}
