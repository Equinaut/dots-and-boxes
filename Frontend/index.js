const socket = io("http://dotsandboxes.jamescameron.me");

let PHASE = 0;
//Phase is 0 on menu screen
//Phase is 1 in waiting room
//Phase is 2 in game

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

function createLine(startPosition, endPosition) { //Creates a new line with the given coordinates
  let newLine = new Line(startPosition, endPosition); //New line object
  let doesntExist = true;
  for (line of lines) {
    if (newLine.equals(line)) doesntExist = false; //Finds if the new line already exists
  }
  if (doesntExist) { //If line is new then add to list
    socket.emit("move", newLine.startPosition, newLine.endPosition);
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

function draw() {
  for (let element of document.getElementsByClassName("section")) {
    if (PHASE==0 && element.classList.contains("JoinMenu")) element.hidden = false;
    else if (PHASE==1 && element.classList.contains("WaitingRoom")) element.hidden = false;
    else if (PHASE==2 && element.classList.contains("Game")) element.hidden = false;
    else element.hidden = true;
  }
  if (PHASE == 0) {

  } else if (PHASE == 1) {

  } else if (PHASE == 2) {
    drawGrid();
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

function joinGame() {
  let code = document.getElementById("gameIdInput").value;
  document.getElementById("gameIdInput").value = "";
  console.log(code);
  socket.emit("joinGame", code);
}

function leave() {
  socket.emit("leave");
}
function startGameButton() {
  socket.emit("gameStart");
}

socket.on("gameEnd", () => {
  PHASE = 0;
  console.log("Game ended");
});

socket.on("gameJoin", (msg) => {
  if (msg.success) PHASE = 1;
  else alert(msg.errorMessage || "Unknown error");
});

socket.on("gameStart", (msg) => {
  console.log("Starting game", msg);
  startGame(msg.width || 5, msg.width || 5);
  PHASE = 2;
});

socket.on("gameState", (msg) => {
  console.log("Gamestate received");
  let newLines = [];
  let newSquares = [];
  for (let line of msg.lines) newLines.push(new Line(line.startPosition, line.endPosition));
  for (let square of msg.squares) newSquares.push(new Square(square.topLeft));
  lines = newLines;
  squares = newSquares;
  console.log(msg.lines, msg.squares);
});

setInterval(draw, 5); //Calls the draw function every 5 ms
