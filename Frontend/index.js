const socket = io("http://localhost:3000");
const SQUARE_SIZE = 75;

let GRID_WIDTH = 6;
let GRID_HEIGHT = 6;
let board;
let boardCanvas;
let mouseX = mouseY = 0;
let mouseDown = false;
let dragStartPosition = [0, 0];

let lines = [];

class Line {
  constructor(startPosition, endPosition) {
    this.startPosition = [SQUARE_SIZE*(startPosition[0]+0.5),SQUARE_SIZE*(startPosition[1]+0.5)];
    this.endPosition = [SQUARE_SIZE*(endPosition[0]+0.5),SQUARE_SIZE*(endPosition[1]+0.5)];;
  }
  draw() {
    let canvasContext = boardCanvas.getContext("2d");
    canvasContext.moveTo(this.startPosition[0], this.startPosition[1]);
    canvasContext.lineTo(this.endPosition[0], this.endPosition[1]);
    canvasContext.stroke();
  }
}



function startGame(boardWidth, boardHeight) {
  GRID_WIDTH = boardWidth;
  GRID_HEIGHT = boardHeight;
  board = [];
  for (let y=0; y<boardHeight; y++) {
    board[y] = [];
    for (let x=0; x<boardWidth; x++) {
      board[y][x] = null;
    }
  }
  boardCanvas = document.getElementById("board");
  boardCanvas.width = (GRID_WIDTH + 1) * SQUARE_SIZE;
  boardCanvas.height = (GRID_HEIGHT + 1) * SQUARE_SIZE;
}

function drawGrid() {
  if (boardCanvas == null) return;

  boardCanvas.width = (GRID_WIDTH + 1) * SQUARE_SIZE;
  boardCanvas.height = (GRID_HEIGHT + 1) * SQUARE_SIZE;

  let canvasContext = boardCanvas.getContext("2d");
  for (let x = 0; x < GRID_WIDTH + 1; x++) {
    for (let y = 0; y < GRID_HEIGHT + 1; y++) {
      canvasContext.fillStyle = "black";
      canvasContext.beginPath();
      canvasContext.ellipse((x + 0.5) * SQUARE_SIZE, (y + 0.5) * SQUARE_SIZE, 8, 8, 0, 0, 2 * Math.PI);
      canvasContext.fill();
    }
  }

  //Draw lines
  for (let line of lines) line.draw();

  //Draw cursor
  canvasContext.beginPath();
  canvasContext.ellipse(SQUARE_SIZE*(Math.floor(mouseX/SQUARE_SIZE)+0.5), SQUARE_SIZE*(Math.floor(mouseY/SQUARE_SIZE)+0.5), 15, 15, 0, 0, 2 * Math.PI);
  canvasContext.stroke();

  if (mouseDown) {
    let dragEndPosition = [Math.floor(mouseX/SQUARE_SIZE), Math.floor(mouseY/SQUARE_SIZE)];
    if ((Math.abs(dragStartPosition[0] - dragEndPosition[0]) <= 1 && Math.abs(dragStartPosition[1] - dragEndPosition[1]) <= 1)) {
      canvasContext.moveTo((dragStartPosition[0]+0.5)*SQUARE_SIZE, (dragStartPosition[1]+0.5)*SQUARE_SIZE);
      canvasContext.lineTo((dragEndPosition[0]+0.5)*SQUARE_SIZE, (dragEndPosition[1]+0.5)*SQUARE_SIZE);
      canvasContext.stroke();
    }
  }
}

startGame(10,10);

document.getElementById("board").addEventListener("mousemove", (mouseEvent) => {
  [mouseX, mouseY] = [mouseEvent.offsetX, mouseEvent.offsetY]
});

document.getElementById("board").addEventListener("mousedown", (mouseEvent) => {
  mouseDown = true;
  dragStartPosition = [Math.floor(mouseX/SQUARE_SIZE), Math.floor(mouseY/SQUARE_SIZE)];
});

document.getElementById("board").addEventListener("mouseup", (mouseEvent) => {
  mouseDown = false;
  if ((Math.abs(dragStartPosition[0] - Math.floor(mouseX/SQUARE_SIZE)) <= 1 && Math.abs(dragStartPosition[1] - Math.floor(mouseY/SQUARE_SIZE)) <= 1)) {
    lines.push(new Line(dragStartPosition, [Math.floor(mouseX/SQUARE_SIZE), Math.floor(mouseY/SQUARE_SIZE)]));
  }
});

setInterval(drawGrid, 20);
