const socket = io(SERVER_ADDRESS);

let PHASE = 0;
//Phase is 0 in waiting room
//Phase is 1 in game

let DEFAULT_WIDTH = 5; //Default width of grid in dots
let DEFAULT_HEIGHT = 5; //Default height of grid in dots
let SQUARE_SIZE = 100; //Distance between dots in pixels

let allPlayers = [];
let currentTurn = 0;
let boardCanvas; //DOM element of HTML canvas
let mouseX = mouseY = 0; //Mouse X and Y position relative to canvas updated whenever mouse is moved
let mouseDown = false; //If the mouse is pressed or not
let dragStartPosition; //Start location of mouse drag

let selected = false; //If a dot is selected
let selectedPosition; //Position of selected dot

let lines = []; //Array of line objects
let squares = [];

if (document.getElementById("widthInput")) document.getElementById("widthInput").value = GRID_WIDTH;
if (document.getElementById("heightInput")) document.getElementById("heightInput").value = GRID_HEIGHT;
document.getElementById("widthDisplay").innerText = GRID_WIDTH;
document.getElementById("heightDisplay").innerText = GRID_HEIGHT;

if (showAdmin==null) showAdmin = false;
for (let element of document.getElementsByClassName("adminSetting")) element.hidden = !showAdmin;

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
}

function drawGrid() {
  if (boardCanvas == null) return; //If there is no canvas element, then return

  boardCanvas.width  = boardCanvas.offsetWidth;
  boardCanvas.height = boardCanvas.offsetHeight;

  //Set square size based on viewport size
  SQUARE_SIZE = Math.min(boardCanvas.width / (GRID_WIDTH), boardCanvas.height / (GRID_HEIGHT));

  //Draw squares
  for (let square of squares) square.draw(); //Draws every square object
  //Draw lines
  for (let line of lines) line.draw(); //Draws every line object

  let canvasContext = boardCanvas.getContext("2d"); //Draw dots of board
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      canvasContext.fillStyle = "black";
      if (selected && selectedPosition.toString() == [x, y].toString()) canvasContext.fillStyle = "#00e30b";
      canvasContext.beginPath();
      canvasContext.ellipse((x + 0.5) * SQUARE_SIZE, (y + 0.5) * SQUARE_SIZE, 8, 8, 0, 0, 2 * Math.PI);
      canvasContext.fill(); //Draws dots for each dot on grid
    }
  }

  if (mouseDown && currentTurn==playerNumber) { //Draw example line when mouse is being dragged
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
    if (PHASE==0 && element.classList.contains("WaitingRoom")) element.hidden = false;
    else if (PHASE==1 && element.classList.contains("Game")) element.hidden = false;
    else element.hidden = true;
  }


  //Draw previews of players square in the playerList

  for (let element of document.getElementsByClassName("playerList")) {
    for (let i=0; i < allPlayers.length; i++) {
      for (let colourSample of element.children[i].getElementsByClassName("colourSample")) {
        let canvasContext = colourSample.getContext("2d");
        let pattern = allPlayers[i].pattern;
        drawSquare(canvasContext, pattern, 0, 0, 300);
      }
    }
  }

  if (PHASE == 1) {
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
    if (selected && currentTurn==playerNumber) {
      if (dragEndPosition.toString() == selectedPosition.toString()) selected = false;
      if ((Math.abs(dragEndPosition[0] - selectedPosition[0]) +  Math.abs(dragEndPosition[1] - selectedPosition[1]) == 1)) {
        createLine(selectedPosition, dragEndPosition);
        selected = false;
      }
    } else {
      if (currentTurn==playerNumber) {
        selected = true;
        selectedPosition = dragEndPosition;
      }
    }
  }
}); //End of mouse drag, new line will be created if valid

function sizeChange(direction) {
  let size = {};
  if (direction=="width") {
    let width = document.getElementById("widthInput").value;
    document.getElementById("widthDisplay").innerText = width;
    GRID_WIDTH = width;
    size.width = width;
  } else if (direction=="height") {
    let height = document.getElementById("heightInput").value;
    document.getElementById("heightDisplay").innerText = height;
    GRID_HEIGHT = height;
    size.height = height;
  }
  socket.emit("sizeChange", size);
}
function colourChange() {
  socket.emit("colourChange", document.getElementById("colourInput").value);
}
document.getElementById("colourInput").addEventListener("input", () => colourChange());

if (document.getElementById("widthInput")) document.getElementById("widthInput").addEventListener("input", () => sizeChange("width"));
if (document.getElementById("heightInput")) document.getElementById("heightInput").addEventListener("input", () => sizeChange("height"));

document.getElementById("usernameInput").addEventListener("keydown", (e) => {
  if (!e) return;
  if (e.keyCode==13) changeUsername();
})
function leave() {
  socket.emit("leave");
}
function startGameButton() {
  socket.emit("gameStart");
}
function restartGame() {
  socket.emit("restart");
}
function changeUsername() {
  let name = document.getElementById("usernameInput").value;
  document.getElementById("usernameInput").value = "";
  console.log(name);
  socket.emit("setName", name);
}

socket.on("gameEnd", () => {
  console.log("Gameover");
  location.href='/';
});
socket.on("disconnect", () => {
  console.log("Gameover");
  location.href='/';
});


socket.on("gameStart", (msg) => {
  console.log("Starting game", msg);
  lines = [];
  squares = [];
  GRID_WIDTH = msg.width || DEFAULT_WIDTH;
  GRID_HEIGHT = msg.height || DEFAULT_HEIGHT;
  startGame(msg.width || DEFAULT_WIDTH, msg.height || DEFAULT_HEIGHT);
  PHASE = 1;
});

socket.on("gameState", (msg) => {
  //Runs whenever a new gameState is received
  console.log("Gamestate received");
  currentTurn = msg.currentTurn;
  let newLines = [];
  let newSquares = [];
  for (let line of msg.lines) newLines.push(new Line(line.startPosition, line.endPosition));
  for (let square of msg.squares) newSquares.push(new Square(square.topLeft, square.player));
  //Create line and square elements
  lines = newLines;
  squares = newSquares;
  //Replace originals
  document.getElementById("gameEndControls").hidden = !(showAdmin && msg.finished)

  if (msg.finished) { //If game finished
    document.getElementById("playerTurn").innerText="Waiting for game to start";
    document.getElementById("topBar").classList.remove("currentTurn");
    document.getElementById("topBar").classList.add("waitingForNewGame");
  } else if (currentTurn == playerNumber) {
    document.getElementById("playerTurn").innerText="Your turn";
    document.getElementById("topBar").classList.add("currentTurn");
    document.getElementById("topBar").classList.remove("waitingForNewGame");
  } else {
    selected = false;
    document.getElementById("playerTurn").innerText="Waiting for other players";
    document.getElementById("topBar").classList.remove("currentTurn");
    document.getElementById("topBar").classList.remove("waitingForNewGame");
  }

  console.log(msg);
});

socket.on("playerList", (players) => { //When playerlist received from server
  allPlayers = players; //Update players list
  let playerListElements = document.getElementsByClassName("playerList");
  for (let element of playerListElements) element.innerHTML = ""; //Clear list

  for (let player of players) {
    for (let element of playerListElements) {
      //Create item for list
      let newPlayerRow = document.createElement("div");
      let newPlayer = document.createElement("p");
      newPlayer.innerText = (player.number+1)+". "+player.name;
      if (PHASE == 1) {
        newPlayer.innerText = (player.number+1)+". "+player.name +
                               " | " + (player.score || 0) + " point" + {true: "s", false:""}[player.score!=1] +
                               " | " + (player.wins || 0) + " win" + {true: "s", false:""}[player.wins!=1];
      }

      //Add player number and name to p tag in row
      newPlayerRow.classList.add("player"); //Add the player class to this

      if (PHASE == 1 && player.number == currentTurn) newPlayerRow.classList.add("currentTurn");
      let colourSample = document.createElement("canvas");
      colourSample.classList.add("colourSample");

      if (player.number == playerNumber) newPlayerRow.classList.add("thisPlayer");

      newPlayerRow.appendChild(newPlayer);
      newPlayerRow.appendChild(colourSample);

      element.appendChild(newPlayerRow); //Adds elements to list
    }
  }
});


socket.on("gridSize", (width, height) => {
  if (document.getElementById("widthInput")) document.getElementById("widthInput").value = width;
  if (document.getElementById("heightInput")) document.getElementById("heightInput").value = height;
  document.getElementById("widthDisplay").innerText = width;
  document.getElementById("heightDisplay").innerText = height;
  GRID_WIDTH = width;
  GRID_HEIGHT = height;
});


setInterval(draw, 50); //Calls the draw function every 50 ms
