const socket = io("http://dotsandboxes.jamescameron.me");

let GRID_WIDTH = 5; //Width of the grid in dots
let GRID_HEIGHT = 5; //Height of the grid in dots
let SQUARE_SIZE = 100; //Distance between dots in pixels
let TOTAL_PLAYERS = 1; //Total number of players in the current game
let CURRENT_TURN = 0; //Player number of whoevers turn it is
let PLAYER_NAMES = []; //Name of every player in the game

let boardCanvas; //DOM element of HTML canvas
let mouseX = mouseY = 0; //Mouse X and Y position relative to canvas updated whenever mouse is moved
let mouseDown = false; //If the mouse is pressed or not
let dragStartPosition; //Start location of mouse drag

let selected = false; //If a dot is selected
let selectedPosition; //Position of selected dot

let lines = []; //Array of line objects
let squares = [];

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

function createLine(startPosition, endPosition) { //Creates a new line with the given coordinates
  let newLine = new Line(startPosition, endPosition); //New line object
  let doesntExist = true;
  for (line of lines) {
    if (newLine.equals(line)) doesntExist = false; //Finds if the new line already exists
  }
  if (doesntExist) { //If line is new then add to list
    lines.push(newLine); //Add newLine to lines list
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
      for (let line of lines) {
        if (line.equals(topLines[i])) foundLinesTop[i] = true;
        if (line.equals(bottomLines[i])) foundLinesBottom[i] = true;
        if (line.equals(rightLines[i])) foundLinesRight[i] = true;
        if (line.equals(leftLines[i])) foundLinesLeft[i] = true;

        if (foundLinesTop[i] && foundLinesBottom[i] && foundLinesRight[i] && foundLinesLeft[i]) break;
      }
    }
    if (newLine.endPosition[1]==newLine.startPosition[1]) { //Horizontal line
      if (foundLinesTop.toString() == [true, true, true].toString()) squares.push(new Square(newLine.startPosition));
      if (foundLinesBottom.toString() == [true, true, true].toString()) squares.push(new Square([newLine.startPosition[0], newLine.startPosition[1] - 1]));
    } else { //Vertical line
      if (foundLinesRight.toString() == [true, true, true].toString()) squares.push(new Square([newLine.startPosition[0] - 1, newLine.startPosition[1]]));
      if (foundLinesLeft.toString() == [true, true, true].toString()) squares.push(new Square([newLine.startPosition[0], newLine.startPosition[1]]));
    }
  }

  delete newLine; //Deletes new line object
  return doesntExist; //Returns boolean, if the new line was created or not
}


function startGame(boardWidth, boardHeight) { //Function called whenever a game begins
  GRID_WIDTH = boardWidth;
  GRID_HEIGHT = boardHeight;

  boardCanvas = document.getElementById("board");
  boardCanvas.width = GRID_WIDTH * SQUARE_SIZE;
  boardCanvas.height = GRID_HEIGHT * SQUARE_SIZE;
}

function drawGrid() {
  if (boardCanvas == null) return; //If there is no canvas element, then return

  SQUARE_SIZE = Math.min((window.innerWidth - document.getElementById("board").getBoundingClientRect().x) / (GRID_WIDTH + 1), (window.innerHeight - document.getElementById("board").getBoundingClientRect().y) / (GRID_HEIGHT + 1));
  //Set square size based on viewport size
  boardCanvas.width = GRID_WIDTH * SQUARE_SIZE;
  boardCanvas.height = GRID_HEIGHT * SQUARE_SIZE; //Change size of canvas

  //Draw squares
  for (let square of squares) square.draw(); //Draws every square object
  //Draw lines
  for (let line of lines) line.draw(); //Draws every line object

  let canvasContext = boardCanvas.getContext("2d");
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      canvasContext.fillStyle = "black";
      if (selected && selectedPosition.toString() == [x, y].toString()) canvasContext.fillStyle = "#00e30b";
      canvasContext.beginPath();
      canvasContext.ellipse((x + 0.5) * SQUARE_SIZE, (y + 0.5) * SQUARE_SIZE, 8, 8, 0, 0, 2 * Math.PI);
      canvasContext.fill(); //Draws dots for each dot on grid
    }
  }

  if (mouseDown) { //Draw example line when mouse is being dragged
    let dragEndPosition = [Math.floor(mouseX/SQUARE_SIZE), Math.floor(mouseY/SQUARE_SIZE)]; //End position of mouse drag
    if ((Math.abs(dragStartPosition[0] - dragEndPosition[0]) + Math.abs(dragStartPosition[1] - dragEndPosition[1]) <= 1)) {
      canvasContext.lineWidth = 8;
      canvasContext.beginPath();
      canvasContext.moveTo((dragStartPosition[0]+0.5)*SQUARE_SIZE, (dragStartPosition[1]+0.5)*SQUARE_SIZE);
      canvasContext.lineTo((dragEndPosition[0]+0.5)*SQUARE_SIZE, (dragEndPosition[1]+0.5)*SQUARE_SIZE);
      canvasContext.stroke(); //Draws temporary line, to show where new line will be placed when mouse is released
    }
  }
}

startGame(GRID_WIDTH, GRID_HEIGHT); //Start game

document.getElementById("board").addEventListener("mousemove", (mouseEvent) => {
  [mouseX, mouseY] = [mouseEvent.offsetX, mouseEvent.offsetY]
}); //Updates mouse position when mouse is moved

//Mouse drag events
document.getElementById("board").addEventListener("mousedown", (mouseEvent) => {
  mouseDown = true;
  dragStartPosition = [Math.floor(mouseX/SQUARE_SIZE), Math.floor(mouseY/SQUARE_SIZE)];
}); //Start of mouse drag

document.getElementById("board").addEventListener("mouseup", (mouseEvent) => {
  mouseDown = false;
  let dragEndPosition = [Math.floor(mouseX/SQUARE_SIZE), Math.floor(mouseY/SQUARE_SIZE)];
  if ((Math.abs(dragStartPosition[0] - Math.floor(mouseX/SQUARE_SIZE)) +  Math.abs(dragStartPosition[1] - Math.floor(mouseY/SQUARE_SIZE)) == 1)) {
    //This runs when the mouse is unpressed 1 squre up down and to the left or the right of where it was pressed
    createLine(dragStartPosition, dragEndPosition);
  } else if (Math.abs(dragStartPosition[0] - dragEndPosition[0]) +  Math.abs(dragStartPosition[1] - dragEndPosition[1]) == 0) {
    //This runs when the mouse is unpressed in the same place that it was pressed
    if (selected) {
      if (dragEndPosition.toString() == selectedPosition.toString()) selected = false;
      if ((Math.abs(dragEndPosition[0] - selectedPosition[0]) +  Math.abs(dragEndPosition[1] - selectedPosition[1]) == 1)) {
        createLine(selectedPosition, dragEndPosition);
        selected = false;
      }
    } else {
      selected = true;
      selectedPosition = dragEndPosition;
    }
  }
}); //End of mouse drag, new line will be created if valid




setInterval(drawGrid, 5); //Calls the draw function every 5 ms
