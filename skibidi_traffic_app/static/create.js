import Punct       from "./Punct.js";
import Intersectie from "./Intersectie.js";
import Strada      from "./Strada.js";
import { exportToJSON } from "./data_flow.js";

console.log("Loaded JS!!!!");
const PIXELI_PE_METRU = 11.43;
const METRI_PE_PIXEL = 1 / PIXELI_PE_METRU;

const drawingContainer = document.getElementById("drawing_container");
drawingContainer.style.height = "90vh";

const sidebar = document.getElementById("sidebar");
const sidebar2 = document.getElementById("sidebar2");
// sidebar2.style.maxWidth = sidebar.style.width;
const sidebarWidth = getComputedStyle(sidebar).width;
sidebar2.style.width = sidebarWidth;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let scale = 1; //cat de zoomat e canvas ul
let offsetX = 0; //x ul mouse ului raportat la coltul stg sus al elementului
let offsetY = 0; //y-ul....

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let backgroundImage = null;

const imageLoader = document.getElementById('imageLoader'); //element cu care incarc imagine
const loadImageBtn = document.getElementById('loadImage'); //butonul care face image loader sa apara in pagina

let puncteIntersectieCustom = [];
let modDesenarePuncte = false;
let modDesenareIntersectie = false;
let listaVarfuriTemp = [];
let intersectii = [];

const lungimeLive = document.getElementById('lungimeLive');

let punctSelectatIndex = -1; // indexul punctului din listaVarfuri
let intersectieSelectata = null; // obiect Intersectie
let modMutarePunct = false; // true dacă user ul trage un punct

let mousePosX = 0;
let mousePosY = 0;

let modAdaugareStrada = false;
let stradaNouaIndexLatura = null;

let modDefinireTraseu = false;
let puncteTraseu = [];
let punctStartInfo = null;

function distantaPunctLaSegment(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = len_sq !== 0 ? dot / len_sq : -1;

  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offsetX) / scale;
    const y = (e.clientY - rect.top - offsetY) / scale;
    return { x, y };
}

function resizeCanvas() {
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  drawScene(); // redesenează
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // apel inițial

function deseneazaTraseeSalvate() {
  for (let inter of intersectii) {
    if (!Array.isArray(inter.trasee)) continue;
    for (let traseu of inter.trasee) {
      if (traseu.puncte.length > 1) {
        ctx.beginPath();
        ctx.moveTo(traseu.puncte[0].x, traseu.puncte[0].y);
        for (let i = 1; i < traseu.puncte.length; i++) {
          ctx.lineTo(traseu.puncte[i].x, traseu.puncte[i].y);
        }
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Linie 5px, spațiu 5px
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }
}


//functie care deseneaza elementele din canvas
function drawScene() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // resetare transformare //anulez orice zoom, orice drag, e o matrice care reprezinta ~ baza sistemului 
    ctx.clearRect(0, 0, canvas.width, canvas.height); //curat tot ca sa o iau de la 0

    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY); // aplicare zoom + pan

    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }

    for(let inter of intersectii){
      inter.deseneaza(ctx);
      let p = inter.getCentruGreutate();
      let pct = new Punct(p.x, p.y);
      pct.deseneaza(ctx);
    }

    //daca intersectia e in curs de desenare
    if (modDesenareIntersectie && listaVarfuriTemp.length > 0) {
      ctx.beginPath();
      ctx.moveTo(listaVarfuriTemp[0].x, listaVarfuriTemp[0].y);
      
      for (let i = 1; i < listaVarfuriTemp.length; i++) {
          ctx.lineTo(listaVarfuriTemp[i].x, listaVarfuriTemp[i].y);
          
      }
      ctx.strokeStyle = "gray";
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let p of listaVarfuriTemp){
        p.deseneaza(ctx);
      }
    }

    if (modMutarePunct && intersectieSelectata && punctSelectatIndex !== -1) {
      const puncte = intersectieSelectata.listaVarfuri;
      const idx = punctSelectatIndex;
      const prev = puncte[(idx - 1 + puncte.length) % puncte.length];
      const next = puncte[(idx + 1) % puncte.length];

      const mouseX = mousePosX;
      const mouseY = mousePosY;

      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(mouseX, mouseY);
      ctx.lineTo(next.x, next.y);
      ctx.strokeStyle = 'gray';
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (modDefinireTraseu) {
  deseneazaTraseeSalvate();
}

      if (modDefinireTraseu && !punctStartInfo) {
        // 🔵 Desenează toate punctele de START (puncte verzi)
        for (let inter of intersectii) {
          for (let strada of inter.listaStrazi) {
            const dir = strada.getVectorDirectie();
            const perp = { x: -dir.y, y: dir.x };
            const start = strada.getPunctConectare();

            for (let b = 0; b < strada.benziIn; b++) {
              const offset = -strada.latimeBanda * (b + 0.5) - strada.spatiuVerde / 2;
              const px = start.x + perp.x * offset;
              const py = start.y + perp.y * offset;

              ctx.beginPath();
              ctx.arc(px, py, 5, 0, 2 * Math.PI);
              ctx.fillStyle = "green";
              ctx.fill();
              ctx.strokeStyle = "white";
              ctx.stroke();
            }
          }
        }
      }

      if (modDefinireTraseu && punctStartInfo) {
        // Desenează linia curentă
        if (puncteTraseu.length > 1) {
          ctx.beginPath();
          ctx.moveTo(puncteTraseu[0].x, puncteTraseu[0].y);
          for (let i = 1; i < puncteTraseu.length; i++) {
            ctx.lineTo(puncteTraseu[i].x, puncteTraseu[i].y);
          }
          ctx.strokeStyle = "orange";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // 🔘 Punctele intermediare
        for (let i = 1; i < puncteTraseu.length ; i++) {
          ctx.beginPath();
          ctx.arc(puncteTraseu[i].x, puncteTraseu[i].y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = "orange";
          ctx.fill();
          ctx.strokeStyle = "white";
          ctx.stroke();
        }

        // 🔴 END-uri (posibile destinații)
        // for (let inter of intersectii) {
        //   for (let strada of inter.listaStrazi) {
        //     const dir = strada.getVectorDirectie();
        //     const perp = { x: -dir.y, y: dir.x };
        //     const start = strada.getPunctConectare();

        //     for (let b = 0; b < strada.benziIn; b++) {
        //       const offset = -strada.latimeBanda * (b + 0.5) - strada.spatiuVerde / 2;
        //       const px = start.x + perp.x * offset;
        //       const py = start.y + perp.y * offset;

        //       ctx.beginPath();
        //       ctx.arc(px, py, 5, 0, 2 * Math.PI);
        //       ctx.fillStyle = "red";
        //       ctx.fill();
        //       ctx.strokeStyle = "white";
        //       ctx.stroke();
        //     }
        //   }
        // }
        // 🔵 Posibile puncte de final: toate benzile de OUT
        for (let inter of intersectii) {
          for (let sIndex = 0; sIndex < inter.listaStrazi.length; sIndex++) {
            const strada = inter.listaStrazi[sIndex];
            const dir = strada.getVectorDirectie();
            const perp = { x: -dir.y, y: dir.x };
            const start = strada.getPunctConectare(); // punct de conectare pe latura

            for (let b = 0; b < strada.benziOut; b++) {
              const offset = strada.latimeBanda * (b + 0.5) + strada.spatiuVerde / 2;
              const px = start.x + perp.x * offset;
              const py = start.y + perp.y * offset;

              ctx.beginPath();
              ctx.arc(px, py, 5, 0, 2 * Math.PI);
              ctx.fillStyle = "green"; // culoare pentru punct END
              ctx.fill();
              ctx.strokeStyle = "white";
              ctx.stroke();
            }
          }
        }

      }

}

drawScene();

//zoom = Ctrl + Scroll
canvas.addEventListener('wheel', function(e) {
    if (!e.ctrlKey) return; //tb sa fi apasat inainte si ctrl, altfel nu se da zoom

    e.preventDefault(); //opresc orice comportament default al browserului (ex:zoom pe toata pagina si nu doar pe canvas)

    const zoomFactor = 1.1; //canvasul creste cu 10% la fiecare iteratie
    const mouseX = e.offsetX; 
    const mouseY = e.offsetY;

    const wx = (mouseX - offsetX) / scale;
    const wy = (mouseY - offsetY) / scale;

    if (e.deltaY < 0) {
    scale *= zoomFactor;
    } else {
    scale /= zoomFactor;
    }

    offsetX = mouseX - wx * scale;
    offsetY = mouseY - wy * scale;

    drawScene();

    

}, { passive: false });

// 🖱️ Drag pentru pan
canvas.addEventListener('mousedown', function(e) {
  if (e.button === 2){ //daca am facut click dreapta
    isDragging = true;
    dragStartX = e.offsetX;
    dragStartY = e.offsetY;
  }

});

canvas.addEventListener('mousemove', function(e) {

  // const x = (e.offsetX - offsetX) / scale;
  // const y = (e.offsetY - offsetY) / scale;
  // const rect = canvas.getBoundingClientRect();
  // const x = (e.clientX - rect.left - offsetX) / scale;
  // const y = (e.clientY - rect.top - offsetY) / scale;
  const { x, y } = getCanvasCoordinates(e);

  mousePosX = x;
  mousePosY = y;

  if (isDragging) {
    const dx = (e.offsetX - dragStartX);
    const dy = (e.offsetY - dragStartY);

    offsetX += dx;
    offsetY += dy;

    dragStartX = e.offsetX;
    dragStartY = e.offsetY;

    drawScene();
  }

  if (modDesenareIntersectie && listaVarfuriTemp.length > 0) {
    const last = listaVarfuriTemp[listaVarfuriTemp.length - 1];

    const dx = x - last.x;
    const dy = y - last.y;
    const lungime = Math.sqrt(dx * dx + dy * dy).toFixed(2);

    const lungimeLaturaInput = document.getElementById("lungimeLaturaInput");
    if (lungimeLaturaInput){
      lungimeLaturaInput.value = lungime;
    }

    let unghiOX = Math.atan2(-dy, dx) * (180 / Math.PI);

    unghiOX = unghiOX.toFixed(1);
    const unghiLaturaOxInput = document.getElementById("unghiLaturaOxInput");
    if (unghiLaturaOxInput) {
      unghiLaturaOxInput.value = unghiOX;
    }

    if (listaVarfuriTemp.length > 1) {
        const A = listaVarfuriTemp[listaVarfuriTemp.length - 2];
        const B = listaVarfuriTemp[listaVarfuriTemp.length - 1];
        const C = { x, y };
        const v1 = { x: B.x - A.x, y: B.y - A.y };
        const v2 = { x: C.x - B.x, y: C.y - B.y };

        // inversez axa Y pentru canvas
        v1.y *= -1;
        v2.y *= -1;

        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

        let unghiSegmente = "-";
        if (mag1 > 0 && mag2 > 0) {
          let angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
          unghiSegmente = angle.toFixed(1);
        }

        let unghiIntreLaturiInput = document.getElementById("unghiIntreLaturiInput");
        if (unghiIntreLaturiInput && unghiSegmente !== "-") {
          unghiIntreLaturiInput.value = unghiSegmente;
        }
    }

  }

  if (modMutarePunct && intersectieSelectata && punctSelectatIndex !== -1) {
    drawScene(); // update live mutare punct linii punctate
  }

});

unghiIntreLaturiInput.addEventListener("input", () => {
  if (!modDesenareIntersectie) return;
  if (listaVarfuriTemp.length < 3) return;

  const unghiNou = 180-parseFloat(unghiIntreLaturiInput.value);
  if (isNaN(unghiNou)) return;

  const A = listaVarfuriTemp[listaVarfuriTemp.length - 3];
  const B = listaVarfuriTemp[listaVarfuriTemp.length - 2];
  const C = listaVarfuriTemp[listaVarfuriTemp.length - 1];

  const AB = {
    x: B.x - A.x,
    y: B.y - A.y
  };

  // lungime actuală BC
  const lungimeBC = Math.sqrt((C.x - B.x) ** 2 + (C.y - B.y) ** 2);
  if (lungimeBC === 0) return;

  // normalizare vector AB
  const magAB = Math.sqrt(AB.x ** 2 + AB.y ** 2);
  const dirAB = {
    x: AB.x / magAB,
    y: AB.y / magAB
  };

  // rotim dirAB cu unghi dat (atenție la axa Y inversă în canvas)
  const unghiRad = (unghiNou * Math.PI) / 180;

  const dirBC = {
    x: dirAB.x * Math.cos(unghiRad) - dirAB.y * Math.sin(unghiRad),
    y: dirAB.x * Math.sin(unghiRad) + dirAB.y * Math.cos(unghiRad)
  };

  // aplicare: C = B + dirBC * lungime
  C.x = B.x + dirBC.x * lungimeBC;
  C.y = B.y + dirBC.y * lungimeBC;

  drawScene();
});


lungimeLaturaInput.addEventListener("input", () => {
  if (!modDesenareIntersectie) return;
  if (listaVarfuriTemp.length < 2) return;

  const lungimeNoua = parseFloat(lungimeLaturaInput.value);
  if (isNaN(lungimeNoua) || lungimeNoua <= 0) return;

  const p1 = listaVarfuriTemp[listaVarfuriTemp.length - 2];
  const p2 = listaVarfuriTemp[listaVarfuriTemp.length - 1];

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lungimeCurenta = Math.sqrt(dx * dx + dy * dy);
  if (lungimeCurenta === 0) return;

  const factor = lungimeNoua / lungimeCurenta;

  // Actualizează poziția ultimului punct în direcția liniei
  p2.x = p1.x + dx * factor;
  p2.y = p1.y + dy * factor;

  drawScene();
});

unghiLaturaOxInput.addEventListener("input", () => {
  if (!modDesenareIntersectie) return;
  if (listaVarfuriTemp.length < 2) return;

  const unghiNou = -parseFloat(unghiLaturaOxInput.value);
  if (isNaN(unghiNou)) return;

  const p1 = listaVarfuriTemp[listaVarfuriTemp.length - 2];
  const p2 = listaVarfuriTemp[listaVarfuriTemp.length - 1];

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lungime = Math.sqrt(dx * dx + dy * dy);
  if (lungime === 0) return;

  const rad = (unghiNou * Math.PI) / 180;

  // Actualizează poziția ultimului punct
  p2.x = p1.x + Math.cos(rad) * lungime;
  p2.y = p1.y + Math.sin(rad) * lungime;

  drawScene();
});


canvas.addEventListener('mouseup', (e) => {
  if (e.button === 2){
    e.preventDefault();
    isDragging = false;

    if (modMutarePunct) {
      modMutarePunct = false;
      punctSelectatIndex = -1;
      drawScene();
    }
  }
});
// PREVINE meniul click-dreapta
canvas.addEventListener('contextmenu', function (e) {
  e.preventDefault();
});
canvas.addEventListener('mouseleave', () => isDragging = false);


let imageLoaded = false;

loadImageBtn.addEventListener('click', () => {
  if (imageLoaded) {
    backgroundImage = null;
    imageLoaded = false;
    loadImageBtn.textContent = "Încarcă imagine";
    drawScene();
  } else {
    imageLoader.click(); // deschide selectorul de fișier
  }
});

imageLoader.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    backgroundImage = new Image();
    backgroundImage.onload = function() {
      imageLoaded = true;
      loadImageBtn.textContent = "Elimină imaginea";
      drawScene();
    };
    backgroundImage.src = event.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = ''; // permite reîncărcarea aceleiași imagini
});


function isCounterClockwise(pts) {
    // const pts = this.listaVarfuri;
    console.log("apelat functie");
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      sum += (b.x - a.x) * (b.y + a.y);
    }
    return sum > 0; // true dacă e CCW
  }

const butonIntersectieCustom = document.getElementById('intersectieCustom');
butonIntersectieCustom.addEventListener('click', () => {
    //daca inainte sa dau click desenam intersectia, inseamna ca acum am dat click pt ca ma opresc din desenat
    if (modDesenareIntersectie === true){
      butonIntersectieCustom.textContent = "Intersectie custom";
      if (listaVarfuriTemp.length > 3){
        if (isCounterClockwise(listaVarfuriTemp)){
          listaVarfuriTemp.reverse();
        }
        console.log("Apelam constructorul Intersectie cu", listaVarfuriTemp);
        let inter = new Intersectie([...listaVarfuriTemp], []);
        intersectii.push(inter);
        console.log(intersectii);
        listaVarfuriTemp = [];
        drawScene();
      }
      else{
        alert("O intersecție trebuie să aibă cel puțin 3 vârfuri.");
      }
    }
    else{
      butonIntersectieCustom.textContent = "Stop and save";
    }
    modDesenareIntersectie = !modDesenareIntersectie;
    
    listaVarfuriTemp = [];
    canvas.style.cursor = modDesenareIntersectie? 'crosshair':'grab'; // feedback vizual
    butonIntersectieCustom.classList.toggle('active', modDesenareIntersectie);
});

let stradaSelectata = null;
const checkboxTrecere = document.getElementById("checkboxTrecere");

canvas.addEventListener('click', function (e) {
    const { x, y } = getCanvasCoordinates(e);
    if (modDesenareIntersectie) {
        // let x = (e.offsetX - offsetX) / scale; //coordonatele reale ale punctelor, nu cele dupa zoom sau scale
        // let y = (e.offsetY - offsetY) / scale;
        
        // const rect = canvas.getBoundingClientRect();
        // const x = (e.clientX - rect.left - offsetX) / scale;
        // const y = (e.clientY - rect.top - offsetY) / scale;
        // const { x, y } = getCanvasCoordinates(e);
        if (modDesenareIntersectie){
          listaVarfuriTemp.push(new Punct(x,y));
          drawScene();
        }
        
    }
    else{
      // const x = (e.offsetX - offsetX) / scale;
      // const y = (e.offsetY - offsetY) / scale;
      // const { x, y } = getCanvasCoordinates(e);
      let interSelectata = false;
      let gasitPunct = false;

      // Dacă suntem deja în mod mutare, înseamnă că acum CONFIRMĂM poziția nouă
      if (modMutarePunct && punctSelectatIndex !== -1 && intersectieSelectata) {
        intersectieSelectata.listaVarfuri[punctSelectatIndex].x = x;
        intersectieSelectata.listaVarfuri[punctSelectatIndex].y = y;
        modMutarePunct = false;
        punctSelectatIndex = -1;
        drawScene();
        return;
      }

      // Altfel: detectăm intersectia și punctul apropiat
      let found = false;
      intersectieSelectata = null;
      punctSelectatIndex = -1;

      for (let inter of intersectii) {
        inter.selected = false;
        if (inter.continePunct(x, y)) {
          inter.selected = true;
          intersectieSelectata = inter;

          // Caută colț apropiat
          for (let i = 0; i < inter.listaVarfuri.length; i++) {
            const dx = inter.listaVarfuri[i].x - x;
            const dy = inter.listaVarfuri[i].y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 30) {
              punctSelectatIndex = i;
              modMutarePunct = true; // doar acum intrăm în mod mutare
              found = true;
              break;
            }
          }
        }
      }

      
      intersectii.forEach(inter => {
        inter.listaStrazi.forEach(strada => {
          strada.selected = false;
          if (strada.continePunct(x, y)) {
            strada.selected = true;
            intersectieSelectata = inter;
            stradaSelectata = strada;
          }
        });
      });

      if (stradaSelectata) {
        
        checkboxTrecere.checked = stradaSelectata.trecerePietoni;
      } else {
        checkboxTrecere.checked = false;
      }
      drawScene();
      
    }

    if (modDefinireTraseu) {
  const clickPos = getCanvasCoordinates(e);

  // 1️⃣ Selectăm punctul de START
  if (!punctStartInfo) {
    console.log("nu exista punct start")
    for (let inter of intersectii) {
      for (let sIndex = 0; sIndex < inter.listaStrazi.length; sIndex++) {
        const strada = inter.listaStrazi[sIndex];
        const dir = strada.getVectorDirectie();
        const perp = { x: -dir.y, y: dir.x };
        const start = strada.getPunctConectare();

        for (let b = 0; b < strada.benziIn; b++) {
          const offset = -strada.latimeBanda * (b + 0.5) - strada.spatiuVerde / 2;
          const px = start.x + perp.x * offset;
          const py = start.y + perp.y * offset;

          const dx = clickPos.x - px;
          const dy = clickPos.y - py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 7) {
            punctStartInfo = {
              intersectie: inter,
              stradaIndex: sIndex,
              bandaIndex: b
            };
            puncteTraseu = [new Punct(px, py)];
            alert("START setat. Acum adaugă puncte intermediare și apoi un punct de final.");
            drawScene();
            return;
          }
        }
      }
    }
  }

  // 2️⃣ Dacă avem START, verificăm dacă ai dat click pe un END
  if (punctStartInfo) {
    console.log("punct start info", punctStartInfo)
    for (let inter of intersectii) {
      for (let sIndex = 0; sIndex < inter.listaStrazi.length; sIndex++) {
        const strada = inter.listaStrazi[sIndex];
        const dir = strada.getVectorDirectie();
        const perp = { x: -dir.y, y: dir.x };
        const start = strada.getPunctConectare();

        for (let b = 0; b < strada.benziOut; b++) {
          const offset = strada.latimeBanda * (b + 0.5) + strada.spatiuVerde / 2;
          const px = start.x + perp.x * offset;
          const py = start.y + perp.y * offset;

          const dx = clickPos.x - px;
          const dy = clickPos.y - py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 7) {
            console.log("end detectat");
            console.log("punctStartInfo.intersectie", punctStartInfo.intersectie);
            console.log("trasee", punctStartInfo.intersectie.trasee);
            puncteTraseu.push(new Punct(px, py));

            if (!punctStartInfo.intersectie.trasee) {
              punctStartInfo.intersectie.trasee = [];
            }
            punctStartInfo.intersectie.trasee.push({
              stradaIndex: punctStartInfo.stradaIndex,
              bandaIndex: punctStartInfo.bandaIndex,
              puncte: puncteTraseu
            });

            alert("Traseu salvat.");
            // puncteTraseu = [];
            // punctStartInfo = null;
            // modDefinireTraseu = false;
            // drawScene();
            // return;
          }
        }

      }
    }

    // 3️⃣ Dacă nu s-a dat click pe un punct END, atunci e punct intermediar
    console.log("punctStartInfo.intersectie", punctStartInfo.intersectie);
    console.log("trasee", punctStartInfo.intersectie.trasee);
    puncteTraseu.push(new Punct(clickPos.x, clickPos.y));
    console.log(puncteTraseu);
    drawScene();
    return;
  }
}


    if (modAdaugareStrada) {
      // const x = (e.offsetX - offsetX) / scale;
      // const y = (e.offsetY - offsetY) / scale;

      const intersectie = intersectii.find(i => i.selected);
      const varfuri = intersectie.listaVarfuri;

      for (let i = 0; i < varfuri.length; i++) {
        const A = varfuri[i];
        const B = varfuri[(i + 1) % varfuri.length];

        // Distanță punct la segment
        const dist = distantaPunctLaSegment(x, y, A.x, A.y, B.x, B.y);
        if (dist < 30) {
          // Creăm strada
          const strada = new Strada(intersectie, i, 0.5);
          intersectie.listaStrazi = intersectie.listaStrazi ;
          intersectie.listaStrazi.push(strada);

          modAdaugareStrada = false;
          canvas.style.cursor = "grab";
          drawScene();
          return;
        }
      }

      alert("Clickul nu a fost suficient de aproape de o latură.");
    }

});

const adaugaStradaBtn = document.getElementById("adaugaStradaBtn");
adaugaStradaBtn.addEventListener("click", () => {
  if (!intersectii.some(i => i.selected)) {
    alert("Selectează o intersecție mai întâi!");
    return;
  }
  
  modAdaugareStrada = true;
  stradaNouaIndexLatura = null;
  canvas.style.cursor = "pointer";
});

const btnPlusBenziIn = document.getElementById("btnIncrementeazaIn");
const btnMinusBenziIn = document.getElementById("btnDecrementeazaIn");
const btnPlusBenziOut = document.getElementById("btnIncrementeazaOUT");
const btnMinusBenziOut = document.getElementById("btnDecrementeazaOUT");

btnPlusBenziIn.addEventListener("click", () => {
  if (!intersectieSelectata) return;

  const strada = intersectieSelectata.listaStrazi.find(s => s.selected);
  if (!strada) return;

  strada.benziIn++;
  drawScene();
});

btnMinusBenziIn.addEventListener("click", () => {
  if (!intersectieSelectata) return;

  const strada = intersectieSelectata.listaStrazi.find(s => s.selected);
  if (!strada) return;

  if (strada.benziIn > 0) {
    strada.benziIn--;
    drawScene();
  }
});

btnPlusBenziOut.addEventListener("click", () => {
  if (!intersectieSelectata) return;

  const strada = intersectieSelectata.listaStrazi.find(s => s.selected);
  if (!strada) return;

  strada.benziOut++;
  drawScene();
});

btnMinusBenziOut.addEventListener("click", () => {
  if (!intersectieSelectata) return;

  const strada = intersectieSelectata.listaStrazi.find(s => s.selected);
  if (!strada) return;

  if (strada.benziOut > 0) {
    strada.benziOut--;
    drawScene();
  }
});

const pozitieInput = document.getElementById("pozitieConectareInput");
if (stradaSelectata && pozitieInput) {
  pozitieInput.value = stradaSelectata.pozitiePeLatura.toFixed(2);
}

pozitieInput.addEventListener("input", (e) => {
  const valoare = parseFloat(e.target.value);
  if (isNaN(valoare) || valoare < 0 || valoare > 1) return;

  if (!intersectieSelectata) return;

  const strada = intersectieSelectata.listaStrazi.find(s => s.selected);
  if (!strada) return;

  strada.pozitiePeLatura = valoare;
  drawScene();
});

const inputLungimeStrada = document.getElementById("inputLungimeStrada");
if (inputLungimeStrada && stradaSelectata) {
  inputLungimeStrada.value = (stradaSelectata.lungime / PIXELI_PE_METRU).toFixed(1); // în metri
}

inputLungimeStrada.addEventListener("input", (e) => {
  const valoareMetri = parseFloat(e.target.value);
  if (isNaN(valoareMetri) || valoareMetri <= 0) return;

  if (!intersectieSelectata) return;
  const strada = intersectieSelectata.listaStrazi.find(s => s.selected);
  if (!strada) return;

  strada.lungime = valoareMetri * PIXELI_PE_METRU;
  drawScene();
});


checkboxTrecere.addEventListener("change", () => {
  if (!stradaSelectata) return;
  const strada = stradaSelectata;
  if (!strada) return;

  strada.trecerePietoni = checkboxTrecere.checked;
  drawScene();
});


document.getElementById("saveToJSON").addEventListener("click", (e) => {
  e.preventDefault();
  const jsonData = salveazaIntersectie();
  // trimite la backend
});

//------------------------------------------------------------------------------------------------------------
function getCSRFToken() {
  return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
}

async function salveazaIntersectie() {
  if (!intersectii || intersectii.length === 0) {
    alert("Nu ai desenat nicio intersecție.");
    return;
  }

  // const nume = prompt("Dă un nume intersecției:");
  // if (!nume || nume.trim() === "") {
  //   alert("Numele este necesar.");
  //   return;
  // }
//   ⚠️ Dacă intersecția e deja salvată, NU mai cerem numele
  let nume = null;
  if (!idIntersectie) {
    nume = prompt("Dă un nume intersecției:");
    if (!nume || nume.trim() === "") {
      alert("Numele este necesar.");
      return;
    }
  }

  // Construim JSON-ul compatibil cu modelul Django
  const data = {
    intersectii: intersectii.map((inter, idx) => ({
      id: idIntersectie ? parseInt(idIntersectie) : idx,
      varfuri: inter.listaVarfuri.map(p => ({ x: p.x, y: p.y })),
      strazi: inter.listaStrazi.map(str => ({
        indexLatura: str.indexLatura,
        pozitiePeLatura: str.pozitiePeLatura,
        benziIn: str.benziIn,
        benziOut: str.benziOut,
        lungime: str.lungime,
        trecerePietoni: str.trecerePietoni,
        semafoare: {
          in: str.semafoare.in,
          out: str.semafoare.out
        }
      })),
      trasee: inter.trasee.map(t => ({
        stradaIndex: t.stradaIndex,
        bandaIndex: t.bandaIndex,
        puncte: t.puncte.map(p => ({ x: p.x, y: p.y }))
      }))
    }))

  };
  console.log("Date:", JSON.stringify(data, null, 2));

  try {
    const res = await fetch("/Skibidi_traffic/saved/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken()  
      },
      body: JSON.stringify({ id: idIntersectie, nume,data })
    });

    const json = await res.json();

    if (res.ok) {
      if (idIntersectie) {
        alert("Intersecția a fost actualizată cu succes!");
      } else {
        alert("Intersecția a fost salvată cu succes!");
      }
      //console.log("ID intersecție salvată:", json.id);
    } else {
      alert("Eroare la salvare: " + (json.error || "necunoscută"));
    }
  } catch (err) {
    console.error("Eroare completă:", err);
    alert("Eroare de rețea: " + err.message);
  }
}








async function incarcaIntersectie(id) {
  const res = await fetch(`/Skibidi_traffic/incarca/${id}/`);
  const data = await res.json();
  console.log("Date intersecție:", data);
  reconstructFromJSON(data);
}

export function reconstructFromJSON(data) {
  intersectii = [];

  for (const inter of data.intersectii) {
    const puncte = inter.varfuri.map(p => new Punct(p.x, p.y));
    const intersectie = new Intersectie(puncte);

    intersectie.listaStrazi = inter.strazi.map(s => {
      const strada = new Strada(intersectie, s.indexLatura, s.pozitiePeLatura);
      strada.benziIn = s.benziIn;
      strada.benziOut = s.benziOut;
      strada.lungime = s.lungime;
      strada.trecerePietoni = s.trecerePietoni;
      strada.semafoare = {
        in: s.semafoare.in,
        out: s.semafoare.out
      };
      return strada;
    });
    intersectie.trasee = inter.trasee.map(t => ({
      stradaIndex: t.stradaIndex,
      bandaIndex: t.bandaIndex,
      puncte: t.puncte.map(p => new Punct(p.x, p.y))
    }));

    intersectii.push(intersectie);
  }

  drawScene(); // redesenează canvasul
}

// Preia parametru "id" din URL
const params = new URLSearchParams(window.location.search);
const idIntersectie = params.get("id");

if (idIntersectie) {
  incarcaIntersectie(idIntersectie);
}

document.getElementById("simuleazaTrafic").addEventListener("click", async () => {
  const idDinUrl = new URLSearchParams(window.location.search).get("id");
  const nume = idDinUrl ? null : "intersectie_noua";

  const data = {
    intersectii: intersectii.map((inter, idx) => ({
      id: idx,
      varfuri: inter.listaVarfuri.map(p => ({ x: p.x, y: p.y })),
      strazi: inter.listaStrazi.map(str => ({
        indexLatura: str.indexLatura,
        pozitiePeLatura: str.pozitiePeLatura,
        benziIn: str.benziIn,
        benziOut: str.benziOut,
        lungime: str.lungime,
        trecerePietoni: str.trecerePietoni,
        semafoare: str.semafoare
      }))
    }))
  };

  try {
    const res = await fetch("/Skibidi_traffic/simuleaza/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken()
      },
      body: JSON.stringify({ id: idDinUrl, nume, data })
    });

    const json = await res.json();
    if (res.ok) {
      console.log("Intersecția este pregătită pentru simulare:", json.id);
      startSimulare(json.id);
    } else {
      alert("Eroare: " + (json.error || "necunoscută"));
    }
  } catch (err) {
    console.error("Eroare:", err);
    alert("Eroare de rețea");
  }
});

function startSimulare(id) {
  alert("Simularea a început!");
}



document.getElementById("btnDefineRoute").addEventListener("click", () => {
  modDefinireTraseu = !modDefinireTraseu;
  puncteTraseu = [];
  punctStartInfo = null;

  if (modDefinireTraseu) {
    alert("Selectează un punct de START.");
    canvas.style.cursor = "pointer";
    document.getElementById("btnDefineRoute").textContent = "🛣️ Exit definire traseu";
  }
  else{
    canvas.style.cursor = "default";
    document.getElementById("btnDefineRoute").textContent = "🛣️ Definește traseu";
  }

  drawScene();
});
