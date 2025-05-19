import Punct       from "./Punct.js";
import Intersectie from "./Intersectie.js";
import Strada      from "./Strada.js";

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
