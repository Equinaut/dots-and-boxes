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

let nextSettings = Object.assign({}, settings); //Copies settings

let selected = false; //If a dot is selected
let selectedPosition = [0, 0]; //Position of selected dot

let lines = {}; //Array of line objects
let shapes = [];

//Set all settings menus to display the current settings
for (let element of document.getElementsByClassName("widthInput")) element.value = settings.width;
for (let element of document.getElementsByClassName("heightInput")) element.value = settings.height;
for (let element of document.getElementsByClassName("widthDisplay")) element.innerText = settings.width;
for (let element of document.getElementsByClassName("heightDisplay")) element.innerText = settings.height;
for (let element of document.getElementsByClassName("gamemodeInput")) element.value = nextSettings.gamemode || 1;
for (let element of document.getElementsByClassName("gamemodeDisplay")) element.innerText = {1: "Square mode", 2: "Triangle mode"}[nextSettings.gamemode] || "Unknown";

if (nextSettings.gamemode == 2) {
  for (let element of document.querySelectorAll(".setting.size.widthAndHeight")) element.hidden = true;
  for (let element of document.querySelectorAll(".setting.size.width")) element.hidden = false;
} else {
  for (let element of document.querySelectorAll(".setting.size.widthAndHeight")) element.hidden = false;
  for (let element of document.querySelectorAll(".setting.size.width")) element.hidden = true;
}

function createLine(startPosition, endPosition) { //Creates a new line with the given coordinates
  selected = false;
  socket.emit("move", startPosition, endPosition);
}

function validLine(startPosition, endPosition) {
  if (settings.gamemode == 1) {
    let distanceX = startPosition[0] - endPosition[0];
    let distanceY = startPosition[1] - endPosition[1];
    let validDirection = Math.abs(distanceX) + Math.abs(distanceY) == 1;
    let onboardCheck1 = Math.min(...startPosition) >= 0 && Math.min(...endPosition) >= 0;
    let onboardCheck2 = startPosition[1] < settings.height && endPosition[1] < settings.height;
    let onboardCheck3 = startPosition[0] < settings.width && endPosition[0] < settings.width;

    return validDirection && onboardCheck1 && onboardCheck2 && onboardCheck3;

  } else if (settings.gamemode == 2) {
    let distanceX = startPosition[0] - endPosition[0];
    let distanceY = startPosition[1] - endPosition[1];
    let validDirection = Math.abs(distanceX) + Math.abs(distanceY) == 1 || (distanceX == 1 && distanceY == 1) || (distanceX == -1 && distanceY == -1);
    let onboardCheck1 = Math.min(...startPosition) >= 0 && Math.min(...endPosition) >= 0;
    let onboardCheck2 = startPosition[1] < settings.width && endPosition[1] < settings.width;
    let onboardCheck3 = startPosition[0] <= startPosition[1] && endPosition[0] <= endPosition[1];

    return validDirection && onboardCheck1 && onboardCheck2 && onboardCheck3;
  }
  return false;
}

function startGame(boardWidth, boardHeight) { //Function called whenever a game begins
  settings.width = boardWidth;
  settings.height = boardHeight;

  boardCanvas = document.getElementById("board");
}

startGame(settings.width, settings.height); //Start game

document.getElementById("board").addEventListener("mousemove", (mouseEvent) => {
  [mouseX, mouseY] = [mouseEvent.offsetX, mouseEvent.offsetY]
}); //Updates mouse position when mouse is moved

//Mouse drag events
document.getElementById("board").addEventListener("mousedown", (mouseEvent) => {
  mouseDown = true;
  dragStartPosition = [Math.floor(mouseX / SQUARE_SIZE), Math.floor(mouseY / SQUARE_SIZE)]; //Grid mode
  if (settings.gamemode == 2) {
    let y = Math.floor(mouseY /  SQUARE_SIZE / (Math.sqrt(3) / 2));
    dragStartPosition = [Math.floor((mouseX / SQUARE_SIZE) - (settings.width - y) / 2 + 0.5), y]; //Triangle mode
  }
}); //Start of mouse drag

document.getElementById("board").addEventListener("mouseup", (mouseEvent) => {
  mouseDown = false;
  let dragEndPosition = [Math.floor(mouseX / SQUARE_SIZE), Math.floor(mouseY / (SQUARE_SIZE))];
  if (settings.gamemode == 2) {
    let y = Math.floor(mouseY /  SQUARE_SIZE / (Math.sqrt(3) / 2));
    dragEndPosition = [Math.floor((mouseX / SQUARE_SIZE) - (settings.width - y) / 2 + 0.5), y]; //Triangle mode
  }

  let distanceX = dragStartPosition[0] - dragEndPosition[0];
  let distanceY = dragStartPosition[1] - dragEndPosition[1];
  if (validLine(dragStartPosition, dragEndPosition)) {//This runs when the mouse is unpressed 1 squre up down and to the left or the right of where it was pressed
    createLine(dragStartPosition, dragEndPosition);
  } else if (Math.abs(distanceX) +  Math.abs(distanceY) == 0) {
    //This runs when the mouse is unpressed in the same place that it was pressed
    if (selected && currentTurn==playerNumber) {
      if (dragEndPosition.toString() == selectedPosition.toString()) selected = false; //Unselecting selected dot

      distanceX = dragEndPosition[0] - selectedPosition[0];
      distanceY = dragEndPosition[1] - selectedPosition[1];
      if (validLine(selectedPosition, dragEndPosition)) createLine(selectedPosition, dragEndPosition);

    } else if (currentTurn==playerNumber && dragEndPosition[0] >= 0 && dragEndPosition[1] >= 0) {
      if (settings.gamemode == 1) {
        if (dragEndPosition[0] < settings.width && dragEndPosition[1] < settings.height) {
          selected = true;
          selectedPosition = dragEndPosition;
        }
      } else if (settings.gamemode == 2) {
        if (dragEndPosition[1] < settings.width && dragEndPosition[0] <= dragEndPosition[1]) {
          selected = true;
          selectedPosition = dragEndPosition;
        }
      }
    }
  }
}); //End of mouse drag, new line will be created if valid

function sizeChange(direction, value) {
  let size = {};
  if (direction=="width") {
    for (let element of document.getElementsByClassName("widthDisplay")) element.innerText = value;
    for (let element of document.getElementsByClassName("widthInput")) element.value = value;
    size.width = value;
  } else if (direction=="height") {
    for (let element of document.getElementsByClassName("heightDisplay")) element.innerText = value;
    for (let element of document.getElementsByClassName("heightInput")) element.value = value;
    size.height = value;
  }
  socket.emit("sizeChange", size);
}

function settingsChange(setting, value) {
  if (setting == "gamemode" && (value == 1 || value == 2)) {
    socket.emit("settingsChange", "gamemode", value);
  }
}


function colourChange() {
  socket.emit("colourChange", document.getElementById("colourInput").value);
}
if (document.getElementById("colourInput") != null) document.getElementById("colourInput").addEventListener("input", () => colourChange());

if (document.getElementById("usernameInput")) {
  document.getElementById("usernameInput").addEventListener("keydown", (e) => {
    if (!e) return;
    if (e.keyCode==13) changeUsername();
  });
}
function leave() { location.href='/'; }
function startGameButton() {socket.emit("gameStart");}
function restartGame() {socket.emit("restart");}
function changeUsername() {
  socket.emit("setName", name);
  if (document.getElementById("usernameInput")==null) return;
  let name = document.getElementById("usernameInput").value;
  document.getElementById("usernameInput").value = "";
  console.log(name);
}

socket.on("gameEnd", leave);
socket.on("disconnect", leave);

socket.on("becomeAdmin", () => { //When a user inherits admin permissions in a room (happens to second player to join when first player leaves)
  admin = true;
  for (let element of document.getElementsByClassName("adminSetting")) element.hidden = !admin;
  for (let element of document.getElementsByClassName("hideForAdmins")) element.hidden = admin;
});
socket.on("newPlayerNum", (num) => { //When ever the player numbering changes (if someone leaves)
  playerNumber = num;
});

socket.on("gameStart", (msg) => { //Called when the game starts, takes board size as a parameter and moves to the game phase
  lines = {};
  shapes = [];
  settings.width = msg.width || DEFAULT_WIDTH;
  settings.height = msg.height || DEFAULT_HEIGHT;
  startGame(msg.width || DEFAULT_WIDTH, msg.height || DEFAULT_HEIGHT);
  PHASE = 1;
});

socket.on("gameState", (msg) => {
  //Runs whenever a new gameState is received
  currentTurn = msg.currentTurn;

  //Create line and square elements
  lines = msg.lines;
  shapes = msg.shapes;
  //Replace originals
  for (let element of document.getElementsByClassName("gameEndControls")) element.hidden = !(msg.finished && admin);

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
      newPlayer.innerHTML = (player.number+1)+". <span role=" + player.role + ">" + player.name + "</span>";
      if (PHASE == 1) {
        newPlayer.innerHTML = (player.number + 1) + ". <span role=" + player.role + ">" + player.name + "</span>" +
                               " | " + (player.score || 0) + " point" + {true: "s", false: ""}[player.score != 1] +
                               " | " + (player.wins || 0)  + " win"   + {true: "s", false: ""}[player.wins != 1];
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

socket.on("nextSettings", () => {
  settings = Object.assign({}, nextSettings);
  if (selected) {
    if (settings.gamemode == 1) {
      if (!(selectedPosition[0] < settings.width && selectedPosition[1] < settings.height)) selected = false;
    } else if (settings.gamemode == 2) {
      if (!(selectedPosition[1] < settings.width && selectedPosition[0] <= selectedPosition[1])) selected = false;
    }
  }
});

socket.on("settingsChange", (setting, value) => {
  if (setting == "size") {
    if (value.width) nextSettings.width = value.width;
    if (value.height) nextSettings.height = value.height;
    for (let element of document.getElementsByClassName("widthInput")) element.value = nextSettings.width;
    for (let element of document.getElementsByClassName("heightInput")) element.value = nextSettings.height;
    for (let element of document.getElementsByClassName("widthDisplay")) element.innerText = nextSettings.width;
    for (let element of document.getElementsByClassName("heightDisplay")) element.innerText = nextSettings.height;
  }
  else if (setting == "gamemode") {
    if (value == 1) nextSettings.gamemode = value;
    else if (value == 2) nextSettings.gamemode = value;
    for (let element of document.getElementsByClassName("gamemodeInput")) element.value = nextSettings.gamemode || 1;
    for (let element of document.getElementsByClassName("gamemodeDisplay")) element.innerText = {1: "Square mode", 2: "Triangle mode"}[nextSettings.gamemode] || "Unknown";

    if (nextSettings.gamemode == 2) {
      for (let element of document.querySelectorAll(".setting.size.widthAndHeight")) element.hidden = true;
      for (let element of document.querySelectorAll(".setting.size.width")) element.hidden = false;
    } else {
      for (let element of document.querySelectorAll(".setting.size.widthAndHeight")) element.hidden = false;
      for (let element of document.querySelectorAll(".setting.size.width")) element.hidden = true;
    }
  }
});

function toggleSettings() {
  document.getElementById("settingsScreenFilter").hidden = !(document.getElementById("settingsScreenFilter").hidden);
  document.getElementById("settingsScreenContainer").hidden = !(document.getElementById("settingsScreenContainer").hidden);
}

setInterval(draw, 50); //Calls the draw function every 50 ms
