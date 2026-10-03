// V02
export class Node {
  constructor(id, x, y, stopPoint) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.stopPoint = stopPoint;
    this.linkedTo= [];
  }

  link(edge){
    this.linkedTo.push(edge);
  }
}