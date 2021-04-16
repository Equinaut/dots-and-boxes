class Line { //Class for line object
  constructor(startPosition, endPosition) {
    this.startPosition = [startPosition[0],startPosition[1]];
    this.endPosition = [endPosition[0],endPosition[1]];
    if (this.startPosition[0]+this.startPosition[1]>this.endPosition[0]+this.endPosition[1]) [this.startPosition, this.endPosition] = [this.endPosition, this.startPosition];
  }
  draw() { //Draws the line on the canvas
    let canvasContext = boardCanvas.getContext("2d");
    canvasContext.lineWidth = 8;
    canvasContext.beginPath();
    canvasContext.moveTo((this.startPosition[0]+0.5)*SQUARE_SIZE, (this.startPosition[1]+0.5)*SQUARE_SIZE);
    canvasContext.lineTo((this.endPosition[0]+0.5)*SQUARE_SIZE, (this.endPosition[1]+0.5)*SQUARE_SIZE);
    canvasContext.stroke();
  }
  equals(otherLine) { //Checks if a line is identical to the passed in line object
    return this.startPosition.toString()==otherLine.startPosition.toString() && this.endPosition.toString()==otherLine.endPosition.toString();
  }
}

class Square { //Class for square object
  constructor(topLeft) {
    this.topLeft = topLeft;
  }
  draw() {
    let canvasContext = boardCanvas.getContext("2d");
    canvasContext.fillStyle = "green";
    canvasContext.beginPath();
    canvasContext.fillRect((this.topLeft[0]+0.5)*SQUARE_SIZE, (this.topLeft[1]+0.5)*SQUARE_SIZE, SQUARE_SIZE + 1, SQUARE_SIZE + 1);
    canvasContext.fill();
  }
}
