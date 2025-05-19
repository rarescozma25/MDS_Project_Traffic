import Punct from "./Punct.js";
import Strada from "./Strada.js";
console.log("loaded Intersectie");
export default class Intersectie {
  constructor(listaVarfuri, listaStrazi=[]) {
  //   console.log("constructor");
  //   if (Intersectie.isCounterClockwise(listaVarfuri)) {
  //     console.log(Intersectie.isCounterClockwise(listaVarfuri));
  //   listaVarfuri.reverse(); // Facem orientarea orară
  // }
    this.listaVarfuri = listaVarfuri; // array de Punct
    this.listaStrazi = listaStrazi; // 
    this.selected = false; //daca e selectata pe canvas sau nu

  }

  getCentruGreutate() {
  const pts = this.listaVarfuri;
  let A = 0; // aria semn dublu
  let Cx = 0;
  let Cy = 0;

  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;

    const cross = xi * yj - xj * yi;
    A += cross;
    Cx += (xi + xj) * cross;
    Cy += (yi + yj) * cross;
  }

  A *= 0.5;

  // Dacă aria e aproape zero (degenerat), evităm divizarea la 0
  if (Math.abs(A) < 1e-7) return { x: 0, y: 0 };

  Cx /= (6 * A);
  Cy /= (6 * A);

  return { x: Cx, y: Cy };
}

  // static isCounterClockwise(pts) {

  //   let sum = 0;
  //   for (let i = 0; i < pts.length; i++) {
  //     const a = pts[i];
  //     const b = pts[(i + 1) % pts.length];
  //     sum += (b.x - a.x) * (b.y + a.y);
  //   }
  //   return sum > 0; // true dacă e CCW
  // }


  deseneaza(ctx) {
    // Desenează conturul intersecției (poligon închis)
    if (this.listaVarfuri.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.listaVarfuri[0].x, this.listaVarfuri[0].y);
      for (let i = 1; i < this.listaVarfuri.length; i++) {
        ctx.lineTo(this.listaVarfuri[i].x, this.listaVarfuri[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = "#4D4D4D";//"#999";//"#ccc";  // culoare fundal intersecție
      ctx.fill();
      
      ctx.strokeStyle = this.selected? "yellow" : "black";
      ctx.stroke();

      if (this.selected){
          for(let p of this.listaVarfuri){
            p.deseneaza(ctx);
          }
      }

      if (this.listaStrazi && this.listaStrazi.length > 0) {
        for (let strada of this.listaStrazi) {
          strada.deseneaza(ctx);
        }
      }
    }

    // Desenează punctele de intrare
    // for (let p of this.listaIntrari) {
    //   ctx.beginPath();
    //   ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
    //   ctx.fillStyle = "red";
    //   ctx.fill();
    // }
  }

  continePunct(x, y) {
    // Algoritm ray-casting (verificare punct în poligon)
    let inside = false;
    for (let i = 0, j = this.listaVarfuri.length - 1; i < this.listaVarfuri.length; j = i++) {
      const xi = this.listaVarfuri[i].x, yi = this.listaVarfuri[i].y;
      const xj = this.listaVarfuri[j].x, yj = this.listaVarfuri[j].y;

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi + 0.00001) + xi);

      if (intersect) inside = !inside;
    }
    return inside;
  }

}