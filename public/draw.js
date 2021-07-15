function drawShape(canvasContext, pattern, points, size) {
  if (size == null) size = SQUARE_SIZE;
  let leftPoint = points[0];
  let topPoint = points[0];

  for (let point of points) {
    if (point[0] < leftPoint[0]) leftPoint = [...point];
    if (point[1] < topPoint[0]) topPoint = [...point];
  }

  if (pattern.pattern == 1) {
    canvasContext.fillStyle = pattern.colour;
  } else if (pattern.pattern == 2) {
    let colour1 = pattern.colour[0] || "aqua";
    let colour2 = pattern.colour[1] || "lime";

    let date = new Date();
    let offset = date.getMilliseconds() / 500;

    let gradient = canvasContext.createLinearGradient(leftPoint[0] + (offset - 2) * size, 0, leftPoint[0] + (offset + 1) * size, 0);
    gradient.addColorStop(0, colour1);
    gradient.addColorStop(1/3, colour2);
    gradient.addColorStop(2/3, colour1);
    gradient.addColorStop(1, colour2);

    canvasContext.fillStyle = gradient;
  } else {
    canvasContext.fillStyle = "red";
  }

  canvasContext.beginPath();
  canvasContext.moveTo(points[0][0], points[0][1]);
  for (let point of points) canvasContext.lineTo(point[0], point[1]);
  canvasContext.closePath();
  canvasContext.fill();
}


function drawGrid() {
  if (boardCanvas == null) return; //If there is no canvas element, then return

  boardCanvas.width  = boardCanvas.offsetWidth;
  boardCanvas.height = boardCanvas.offsetHeight;

  let canvasContext = boardCanvas.getContext("2d"); //Draw dots of board

  for (let shape of shapes) { //Draw the shapes
    let pattern = allPlayers[shape.player].pattern;
    let newPoints = [];
    for (let point of shape.points) {
      if (settings.gamemode==2) {
        newPoints.push([(point[0] + (settings.width - point[1]) / 2) * SQUARE_SIZE, (point[1] + 0.5) * SQUARE_SIZE * (Math.sqrt(3) / 2)]);
      } else {
        newPoints.push([(point[0] + 0.5) * SQUARE_SIZE, (point[1] + 0.5) * SQUARE_SIZE]);
      }
    }
    drawShape(canvasContext, pattern, newPoints);
  }

  canvasContext.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--dot-colour');
  canvasContext.lineWidth = 8;

  for (let startPosition of Object.keys(lines)) {
    let startPosition2 = [parseInt(startPosition.split(",")[0]), parseInt(startPosition.split(",")[1])];
    for (let endPosition of lines[startPosition]) {
      canvasContext.beginPath();
      if (settings.gamemode == 2) {
        canvasContext.moveTo((startPosition2[0] + (settings.width - startPosition2[1]) / 2) * SQUARE_SIZE, (startPosition2[1] + 0.5) * SQUARE_SIZE * (Math.sqrt(3) / 2));
        canvasContext.lineTo((endPosition[0] + (settings.width - endPosition[1]) / 2) * SQUARE_SIZE, (endPosition[1] + 0.5) * SQUARE_SIZE * (Math.sqrt(3) / 2));
      } else {
        canvasContext.moveTo((startPosition2[0] + 0.5) * SQUARE_SIZE, (startPosition2[1] + 0.5) * SQUARE_SIZE);
        canvasContext.lineTo((endPosition[0] + 0.5) * SQUARE_SIZE, (endPosition[1] + 0.5) * SQUARE_SIZE);
      }
      canvasContext.stroke();
    }
  }


  if (settings.gamemode == 1) { //Square grid mode

    //Set square size based on viewport size
    SQUARE_SIZE = Math.min(boardCanvas.width / (settings.width), boardCanvas.height / (settings.height));

    for (let x = 0; x < settings.width; x++) {
      for (let y = 0; y < settings.height; y++) {
        canvasContext.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--dot-colour');
        if (selected && selectedPosition.toString() == [x, y].toString()) canvasContext.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--selected-dot-colour');
        canvasContext.beginPath();
        canvasContext.ellipse((x + 0.5) * SQUARE_SIZE, (y + 0.5) * SQUARE_SIZE, 8, 8, 0, 0, 2 * Math.PI);
        canvasContext.fill(); //Draws dots for each dot on grid
      }
    }

    if (mouseDown && currentTurn==playerNumber) { //Draw example line when mouse is being dragged
      let dragEndPosition = [Math.floor(mouseX/SQUARE_SIZE), Math.floor(mouseY/SQUARE_SIZE)]; //End position of mouse drag
      if (validLine(dragStartPosition, dragEndPosition)) {
        canvasContext.lineWidth = 8;
        canvasContext.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--dot-colour');
        canvasContext.beginPath();
        canvasContext.moveTo((dragStartPosition[0] + 0.5)*SQUARE_SIZE, (dragStartPosition[1] + 0.5)*SQUARE_SIZE);
        canvasContext.lineTo((dragEndPosition[0] + 0.5)*SQUARE_SIZE, (dragEndPosition[1] + 0.5)*SQUARE_SIZE);
        canvasContext.stroke(); //Draws temporary line, to show where new line will be placed when mouse is released
      }
    }
  } else if (settings.gamemode == 2) { //Triangle mode
    //Draws an equlateral triangle of triangles, uses settings.width but ignores settings.height

    //Set square size based on viewport size
    SQUARE_SIZE = Math.min(boardCanvas.width / (settings.width), boardCanvas.height / (settings.width * (Math.sqrt(3) / 2)));
    for (let y = 0; y < settings.width; y++) {
      for (let x = 0; x <= y; x++) {
        canvasContext.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--dot-colour');
        if (selected && selectedPosition.toString() == [x, y].toString()) canvasContext.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--selected-dot-colour');
        canvasContext.beginPath();
        canvasContext.ellipse((x + (settings.width - y) / 2) * SQUARE_SIZE, (y + 0.5) * SQUARE_SIZE * (Math.sqrt(3) / 2), 8, 8, 0, 0, 2 * Math.PI);
        canvasContext.fill(); //Draws dots for each dot on grid
      }
    }

    if (mouseDown && currentTurn==playerNumber) { //Draw example line when mouse is being dragged
      let y = Math.floor(mouseY /  SQUARE_SIZE / (Math.sqrt(3) / 2));
      let dragEndPosition = [Math.floor((mouseX / SQUARE_SIZE) - (settings.width - y) / 2 + 0.5), y];

      if (validLine(dragStartPosition, dragEndPosition)) {
        canvasContext.lineWidth = 8;
        canvasContext.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--dot-colour');
        canvasContext.beginPath();
        canvasContext.moveTo((dragStartPosition[0] + (settings.width - dragStartPosition[1]) / 2) * SQUARE_SIZE, (dragStartPosition[1] + 0.5) * SQUARE_SIZE * (Math.sqrt(3) / 2));
        canvasContext.lineTo((dragEndPosition[0] + (settings.width - dragEndPosition[1]) / 2) * SQUARE_SIZE, (dragEndPosition[1] + 0.5) * SQUARE_SIZE * (Math.sqrt(3) / 2));
        canvasContext.stroke(); //Draws temporary line, to show where new line will be placed when mouse is released
      }
    }

  }
}


function draw() {
  for (let element of document.getElementsByClassName("section")) {
    if (PHASE==0 && element.classList.contains("WaitingRoom")) {
      element.hidden = false;
      for (let element2 of document.getElementsByClassName("containerOuter")) element2.classList.remove("fullHeight");
    } else if (PHASE==1 && element.classList.contains("Game")) {
      element.hidden = false;
      for (let element2 of document.getElementsByClassName("containerOuter")) element2.classList.add("fullHeight");
    }
    else element.hidden = true;
  }


  //Draw previews of players square in the playerList
  for (let element of document.getElementsByClassName("playerList")) {
    for (let i=0; i < allPlayers.length; i++) {
      for (let colourSample of element.children[i].getElementsByClassName("colourSample")) {
        let canvasContext = colourSample.getContext("2d");
        let pattern = allPlayers[i].pattern;
        drawShape(canvasContext, pattern, [[0, 0], [300, 0], [300, 150], [0, 150]], 300);
      }
    }
  }

  if (PHASE == 1) drawGrid();
}
