class Square { //Class for square object
  constructor(topLeft, playerNumber) {
    this.topLeft = topLeft;
    this.player = playerNumber;
  }
  draw() {
    let canvasContext = boardCanvas.getContext("2d");

    let pattern = allPlayers[this.player].pattern;
    if (pattern.pattern == 1) {
      canvasContext.fillStyle = pattern.colour;
    } else if (pattern.pattern == 2) {
      let colour1 = "aqua";
      let colour2 = "lime";
      let date = new Date();
      let offset = date.getMilliseconds() / 500;
      let gradient = canvasContext.createLinearGradient((this.topLeft[0] - 1.5 + offset) * SQUARE_SIZE, 0, (this.topLeft[0] + 1.5 + offset) * SQUARE_SIZE, 0);
      gradient.addColorStop(0, colour1);
      gradient.addColorStop(1/3, colour2);
      gradient.addColorStop(2/3, colour1);
      gradient.addColorStop(1, colour2);

      canvasContext.fillStyle = gradient;
    } else {
      canvasContext.fillStyle = "red";
    }

    canvasContext.fillRect((this.topLeft[0] + 0.5) * SQUARE_SIZE, (this.topLeft[1] + 0.5) * SQUARE_SIZE, SQUARE_SIZE + 1, SQUARE_SIZE + 1);
    canvasContext.fill();
  }
}
