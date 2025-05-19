import Punct from "./Punct.js";
import Intersectie from "./Intersectie.js";

export default class Strada {
  constructor(intersectie, indexLatura, pozitiePeLatura = 0.5) {
    this.intersectie = intersectie;      // referință la obiectul Intersectie
    this.indexLatura = indexLatura;      // indexul segmentului (ex: între varful 2 și 3)
    this.pozitiePeLatura = pozitiePeLatura; // între 0 și 1 — unde pe segment se conectează

    this.benziIn = 1;
    this.benziOut = 1;
    this.latimeBanda = 40;                // px per bandă
    this.spatiuVerde = 0;                // px — între sensuri, dacă e bulevard
    this.offset = 0;                     // deplasare perpendiculară dacă e nevoie
    this.lungime = 100;                  // lungime default a străzii

    this.trecerePietoni = false;
    this.semafoare = {
      in: false,
      out: false
    };

    this.trasee = []; // posibile direcții de parcurs prin intersecție
  }

  getPunctConectare() {
    console.log("1\n");
    const A = this.intersectie.listaVarfuri[this.indexLatura];
    const B = this.intersectie.listaVarfuri[(this.indexLatura + 1) % this.intersectie.listaVarfuri.length];
    return new Punct(
      A.x + (B.x - A.x) * this.pozitiePeLatura,
      A.y + (B.y - A.y) * this.pozitiePeLatura
    );
  }

  // getVectorDirectie() {
  //   const A = this.intersectie.listaVarfuri[this.indexLatura];
  //   const B = this.intersectie.listaVarfuri[(this.indexLatura + 1) % this.intersectie.listaVarfuri.length];
  //   const dx = B.x - A.x;
  //   const dy = B.y - A.y;
  //   const len = Math.sqrt(dx * dx + dy * dy);
  //   return { x: dy / len, y: -dx / len }; // perpendicular la latură
  // }

  getVectorDirectie() {
    const A = this.intersectie.listaVarfuri[this.indexLatura];
    const B = this.intersectie.listaVarfuri[(this.indexLatura + 1) % this.intersectie.listaVarfuri.length];
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.sqrt(dx * dx + dy * dy);

   let vx = dy / len;
  let vy = -dx / len;
    console.log("dhhfhf");
  // console.log("CCW:", this.intersectie.isCounterClockwise());

  // if (this.intersectie.isCounterClockwise()) {
  //   // Inversăm vectorul perpendicular dacă poligonul e trigonometric
  //   vx = -vx;
  //   vy = -vy;
  // }

  // if (this.intersectie.ccw) {
  //   vx = -vx;
  //   vy = -vy;
  // }

  return { x: vx, y: vy };
  }


  _deseneazaMarcajDreaptaBandaIn(ctx,p,dir,perp,offset){
    const dx = perp.x * offset;
    const dy = perp.y * offset;

  
    ctx.beginPath();
    ctx.moveTo(p.x + dx, p.y + dy);
    ctx.lineTo(p.x + dx + dir.x * this.lungime, p.y + dy + dir.y * this.lungime);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI); // (centruX, centruY, raza, unghiStart, unghiStop)
    ctx.stroke();
  }
  
  _deseneazaBanda(ctx, p, dir, perp, offset, culoare) {
  const dx = perp.x * offset;
  const dy = perp.y * offset;

  ctx.beginPath();
  ctx.moveTo(p.x + dx, p.y + dy);
  ctx.lineTo(p.x + dx + dir.x * this.lungime, p.y + dy + dir.y * this.lungime);
  ctx.strokeStyle = culoare;
  ctx.lineWidth = this.latimeBanda;
  ctx.stroke();
}


  continePunct(px, py) {
  const p = this.getPunctConectare();
  const dir = this.getVectorDirectie(); // vector perpendicular pe latură
  const perp = { x: -dir.y, y: dir.x }; // paralel cu latura

  const banda = this.latimeBanda;
  const dist = (index) => (index - 0.5) * banda;

  let numBenzTotal = this.benziIn + this.benziOut;
  let totalLatime = banda * numBenzTotal + this.spatiuVerde;

  const latimeTotal = this.benziIn * banda + this.spatiuVerde + this.benziOut * banda;
  const offsetMin = dist(-this.benziIn);
  const offsetMax = dist(this.benziOut);

  // 4 puncte ale poligonului dreptunghiular al străzii
  const A = {
    x: p.x + perp.x * offsetMin,
    y: p.y + perp.y * offsetMin
  };
  const B = {
    x: p.x + perp.x * offsetMax,
    y: p.y + perp.y * offsetMax
  };
  const C = {
    x: B.x + dir.x * this.lungime,
    y: B.y + dir.y * this.lungime
  };
  const D = {
    x: A.x + dir.x * this.lungime,
    y: A.y + dir.y * this.lungime
  };

  // Ray-casting — testăm dacă punctul e în poligonul ABCD
  const polygon = [A, B, C, D];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi + 0.00001) + xi);

    if (intersect) inside = !inside;
  }
  return inside;
}


// deseneazaTrecere(ctx, pStart, dir, perp) {
//   const lungime = 30; // lungimea dungilor pe direcția drumului
//   const dungaLatime = 4;
//   const spatiuIntre = 6;

//   const offsetStanga = this.benziIn * this.latimeBanda + this.spatiuVerde / 2;
//   const offsetDreapta = this.benziOut * this.latimeBanda + this.spatiuVerde / 2;

//   const totalLatime = offsetStanga + offsetDreapta;
//   const numDungi = Math.floor(totalLatime / (dungaLatime + spatiuIntre));

//   for (let i = 0; i < numDungi; i++) {
//     const offset = -offsetStanga + i * (dungaLatime + spatiuIntre) + dungaLatime / 2;

//     const a = {
//       x: pStart.x + perp.x * offset+ dir.x * 3,
//       y: pStart.y + perp.y * offset+ dir.y * 3
//     };
//     const b = {
//       x: a.x + dir.x * lungime,
//       y: a.y + dir.y * lungime
//     };

//     ctx.beginPath();
//     ctx.moveTo(a.x, a.y);
//     ctx.lineTo(b.x, b.y);
//     ctx.strokeStyle = "white";
//     const vechiulWidth = ctx.lineWidth;
//     ctx.lineWidth = dungaLatime;
//     ctx.stroke();
//     ctx.lineWidth = vechiulWidth;
//   }
// }

// deseneazaTrecere(ctx, pStart, dir, perp) {
//   const lungime = 30; // cât de mult se întinde o dungă în direcția drumului
//   const dungaLatime = 4;
//   const spatiuIntre = 6;
//   const offsetInitial = 6; // distanța față de marginea stângă a străzii

//   const offsetStanga = this.benziIn * this.latimeBanda + this.spatiuVerde / 2;
//   const offsetDreapta = this.benziOut * this.latimeBanda + this.spatiuVerde / 2;

//   const totalLatime = offsetStanga + offsetDreapta;

//   const usableLatime = totalLatime - 2 * offsetInitial;
//   const numDungi = Math.floor(usableLatime / (dungaLatime + spatiuIntre));

//   for (let i = 0; i < numDungi; i++) {
//     const offset = -offsetStanga + offsetInitial + i * (dungaLatime + spatiuIntre) + dungaLatime / 2;

//     const a = {
//       x: pStart.x + perp.x * offset + dir.x * 3,
//       y: pStart.y + perp.y * offset + dir.y * 3
//     };
//     const b = {
//       x: a.x + dir.x * lungime,
//       y: a.y + dir.y * lungime
//     };

//     ctx.beginPath();
//     ctx.moveTo(a.x, a.y);
//     ctx.lineTo(b.x, b.y);
//     ctx.strokeStyle = "white";
//     const vechiulWidth = ctx.lineWidth;
//     ctx.lineWidth = dungaLatime;
//     ctx.stroke();
//     ctx.lineWidth = vechiulWidth;
//   }
// }

deseneazaTrecere(ctx, pStart, dir, perp) {
  const lungime = 30;
  const dungaLatime = 4;
  const spatiuIntre = 8;
  const offsetInitial = 6;

  const offsetStanga = this.benziIn * this.latimeBanda + this.spatiuVerde / 2;
  const offsetDreapta = this.benziOut * this.latimeBanda + this.spatiuVerde / 2;
  const totalLatime = offsetStanga + offsetDreapta;

  const numDungi = Math.floor(totalLatime / (dungaLatime + spatiuIntre));

  for (let i = 0; i < numDungi; i++) {
    const offset = -offsetStanga + i * (dungaLatime + spatiuIntre) + dungaLatime / 2 + offsetInitial;

    const a = {
      x: pStart.x + perp.x * offset + dir.x * 4,
      y: pStart.y + perp.y * offset + dir.y * 4
    };
    const b = {
      x: a.x + dir.x * lungime ,
      y: a.y + dir.y * lungime 
    };

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = "white";
    const vechiulWidth = ctx.lineWidth;
    ctx.lineWidth = dungaLatime;
    ctx.stroke();
    ctx.lineWidth = vechiulWidth;
  }
}






deseneaza(ctx) {
  const p = this.getPunctConectare();
  const dir = this.getVectorDirectie(); // vector de-a lungul drumului
  const perp = { x: -dir.y, y: dir.x }; // vector perpendicular pe drum

  const banda = this.latimeBanda;
  const spatiu = this.spatiuVerde;
  const dist = (index) => (index - 0.5) * banda;

  const totalIn = this.benziIn;
  const totalOut = this.benziOut;

  const latimeIn = totalIn * banda;
  const latimeOut = totalOut * banda;

  

  // 🛣️ Benzile OUT (spre exteriorul intersecției)
  for (let i = 0; i < this.benziOut; i++) {
    const offset = banda * (i + 0.5) + spatiu / 2;
    this._deseneazaBanda(ctx, p, dir, perp, offset, "black");
  }

  // 🟩 Spațiu verde desenat pe centru (dacă există)
  if (spatiu > 0) {
    const left = {
      x: p.x - perp.x * (spatiu / 2),
      y: p.y - perp.y * (spatiu / 2)
    };
    const right = {
      x: p.x + perp.x * (spatiu / 2),
      y: p.y + perp.y * (spatiu / 2)
    };
    const leftEnd = {
      x: left.x + dir.x * this.lungime,
      y: left.y + dir.y * this.lungime
    };
    const rightEnd = {
      x: right.x + dir.x * this.lungime,
      y: right.y + dir.y * this.lungime
    };

    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.lineTo(rightEnd.x, rightEnd.y);
    ctx.lineTo(leftEnd.x, leftEnd.y);
    ctx.closePath();

    ctx.fillStyle = "#5C8C4A"; // verde închis
    ctx.fill();
  }

  // 🛣️ Benzile IN (spre intersecție)
  for (let i = 0; i < this.benziIn; i++) {
    const offset = -banda * (i + 0.5) - spatiu / 2;
    this._deseneazaBanda(ctx, p, dir, perp, offset, "black");
    this._deseneazaMarcajDreaptaBandaIn(ctx, p, dir, perp, offset - 0.5 * banda);
  }

  // 🔶 Linie galbenă centrală
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + dir.x * this.lungime, p.y + dir.y * this.lungime);
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

    // 🔶 Desenează highlight dacă e selectat
  if (this.selected) {
    const offsetStanga = this.benziIn * banda + spatiu / 2 ;
    const offsetDreapta = this.benziOut * banda + spatiu / 2;

  const A = {
    x: p.x - perp.x * offsetStanga,
    y: p.y - perp.y * offsetStanga
  };
  const B = {
    x: p.x + perp.x * offsetDreapta,
    y: p.y + perp.y * offsetDreapta
  };
  const C = {
    x: B.x + dir.x * this.lungime,
    y: B.y + dir.y * this.lungime
  };
  const D = {
    x: A.x + dir.x * this.lungime,
    y: A.y + dir.y * this.lungime
  };

    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    ctx.lineTo(B.x, B.y);
    ctx.lineTo(C.x, C.y);
    ctx.lineTo(D.x, D.y);
    ctx.closePath();

    ctx.fillStyle = "rgba(255, 200, 0, 0.2)";
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  }

  if (this.trecerePietoni) {
    this.deseneazaTrecere(ctx, p, dir, perp);
  }

}


}