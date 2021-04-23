class Game {
  constructor(room) {
    this.working = true;
    this.width = 5;
    this.height = 5;
    this.room = room;
    this.lines = [];
    this.squares = [];
    this.players = [];
    this.currentTurn = 0;
  }

  createLine(startPosition, endPosition, playerNumber) { //Creates a new line with the given coordinates
    console.log(startPosition,endPosition);
    console.log(Math.max(...startPosition));
    if (Math.max(...endPosition) >= this.width || Math.max(...startPosition) >= this.height || Math.min(...startPosition) < 0 || Math.min(...endPosition) < 0) return;
    let newLine = new Line(startPosition, endPosition); //New line object
    if (!(Math.abs(startPosition[0]-endPosition[0])+Math.abs(startPosition[1]-endPosition[1])==1)) return false; //Lines can only connect from each dot to adjacent dots, and not diagonal, length must be 1
    let doesntExist = true;
    for (let line of this.lines) {
      if (newLine.equals(line)) doesntExist = false; //Finds if the new line already exists
    }
    if (doesntExist) { //If line is new then add to list
      this.lines.push(newLine); //Add newLine to lines list
      //Check if square was formed

      let topLines = [];
      let bottomLines = [];
      let rightLines = [];
      let leftLines = [];

      //Creates new line objects, for each of the lines in all 4 possible squares
      topLines.push(new Line([newLine.startPosition[0],     newLine.startPosition[1] + 1], [newLine.startPosition[0] + 1, newLine.startPosition[1] + 1])); //Bottom
      topLines.push(new Line([newLine.startPosition[0] + 1, newLine.startPosition[1]],     [newLine.startPosition[0] + 1, newLine.startPosition[1] + 1])); //Right
      topLines.push(new Line([newLine.startPosition[0],     newLine.startPosition[1]],     [newLine.startPosition[0],     newLine.startPosition[1] + 1])); //Left
      bottomLines.push(new Line([newLine.startPosition[0],     newLine.startPosition[1] - 1], [newLine.startPosition[0] + 1, newLine.startPosition[1] - 1])); //Top
      bottomLines.push(new Line([newLine.startPosition[0] + 1, newLine.startPosition[1]],     [newLine.startPosition[0] + 1, newLine.startPosition[1] - 1])); //Right
      bottomLines.push(new Line([newLine.startPosition[0],     newLine.startPosition[1]],     [newLine.startPosition[0],     newLine.startPosition[1] - 1])); //Left
      rightLines.push(new Line([newLine.startPosition[0] - 1, newLine.startPosition[1]],     [newLine.startPosition[0] - 1,     newLine.startPosition[1] + 1])); //Left
      rightLines.push(new Line([newLine.startPosition[0],     newLine.startPosition[1]],     [newLine.startPosition[0] - 1,     newLine.startPosition[1]])); //Top
      rightLines.push(new Line([newLine.startPosition[0],     newLine.startPosition[1] + 1], [newLine.startPosition[0] - 1,     newLine.startPosition[1] + 1])); //Bottom
      leftLines.push(new Line([newLine.startPosition[0] + 1, newLine.startPosition[1]],     [newLine.startPosition[0] + 1,     newLine.startPosition[1] + 1])); //Right
      leftLines.push(new Line([newLine.startPosition[0],     newLine.startPosition[1]],     [newLine.startPosition[0] + 1,     newLine.startPosition[1]])); //Top
      leftLines.push(new Line([newLine.startPosition[0],     newLine.startPosition[1] + 1], [newLine.startPosition[0] + 1,     newLine.startPosition[1] + 1])); //Bottom

      let foundLinesTop = [false, false, false]; //Which of each of the 3 other lines are found when searching
      let foundLinesBottom = [false, false, false];
      let foundLinesRight = [false, false, false];
      let foundLinesLeft = [false, false, false];

      for (let i=0; i<3; i++) {
        for (let line of this.lines) {
          if (line.equals(topLines[i])) foundLinesTop[i] = true;
          if (line.equals(bottomLines[i])) foundLinesBottom[i] = true;
          if (line.equals(rightLines[i])) foundLinesRight[i] = true;
          if (line.equals(leftLines[i])) foundLinesLeft[i] = true;

          if (foundLinesTop[i] && foundLinesBottom[i] && foundLinesRight[i] && foundLinesLeft[i]) break;
        }
      }
      if (newLine.endPosition[1]==newLine.startPosition[1]) { //Horizontal line
        if (foundLinesTop.toString() == [true, true, true].toString()) this.squares.push(new Square(newLine.startPosition, playerNumber));
        if (foundLinesBottom.toString() == [true, true, true].toString()) this.squares.push(new Square([newLine.startPosition[0], newLine.startPosition[1] - 1], playerNumber));
      } else { //Vertical line
        if (foundLinesRight.toString() == [true, true, true].toString()) this.squares.push(new Square([newLine.startPosition[0] - 1, newLine.startPosition[1]], playerNumber));
        if (foundLinesLeft.toString() == [true, true, true].toString()) this.squares.push(new Square([newLine.startPosition[0], newLine.startPosition[1]], playerNumber));
      }
      if (!(newLine.endPosition[1]==newLine.startPosition[1] && (foundLinesTop.toString()    == [true, true, true].toString() ||
          foundLinesBottom.toString() == [true, true, true].toString()) ||
          newLine.endPosition[1]!=newLine.startPosition[1] && (foundLinesRight.toString()  == [true, true, true].toString() ||
          foundLinesLeft.toString()   == [true, true, true].toString()))) {
            this.currentTurn = (this.currentTurn+1)%this.players.length;
       }
       console.log(foundLinesTop,foundLinesBottom,foundLinesRight,foundLinesLeft);

    }
    console.log(this.lines);
    console.log(this.squares);
    return doesntExist; //Returns boolean, if the new line was created or not
  }
  updatePlayerNames() {
    let players = [];
    for (let player of this.players) {
      players.push({name: player.name, number: player.number, colour: player.colour});
    }
    return players;
  }
}
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
  constructor(topLeft, playerNumber) {
    this.topLeft = topLeft;
    this.player = playerNumber;
  }
}
module.exports.Game = Game;
module.exports.Line = Line;
module.exports.Square = Square;
