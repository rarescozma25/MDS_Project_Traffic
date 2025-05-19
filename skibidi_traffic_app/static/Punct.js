export default class Punct {
  constructor(x, y, raza = 5) {
    this.x = x;
    this.y = y;
    this.raza = raza;
  }

  deseneaza(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.raza, 0, 2 * Math.PI);
    ctx.fillStyle = "#00A8B7";
    ctx.fill();
  }
}
