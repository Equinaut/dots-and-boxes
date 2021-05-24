const mongoose = require('mongoose');
const User = require('./models/User');

class Game {
  constructor(room) {
    this.width = 5;
    this.height = 5;
    this.room = room;
    this.lines = [];
    this.squares = [];
    this.players = [];
    this.currentTurn = 0;
    this.winCounted = false;
    this.firstPlayerTurn = this.currentTurn;
  }

  restart() {
      this.lines = [];
      this.squares = [];
      this.firstPlayerTurn = (this.firstPlayerTurn+1) % this.players.length;
      this.currentTurn = this.firstPlayerTurn;
      this.winCounted = false;
      for (let player of this.players) player.score = 0;
  }

  get finished() {
    let finished = this.squares.length == (this.width-1) * (this.height-1);
    if (!this.winCounted && finished) {
      let oneWinner = true; //If only one player has the most points (not a draw)
      let winner = null;
      let points = 0;

      for (let i=0; i<this.players.length; i++) {
        let player = this.players[i];
        if (player.score > points) {
          oneWinner = true;
          points = player.score;
          winner = i;
        } else if (player.score == points) {
          oneWinner = false;
          winner = null;
        }
      }

      if (oneWinner && (winner!=null)) this.players[winner].wins++;
      this.calculateStats(); //Add the stats to the database
      this.winCounted = true;
    }
    return finished;
  }

  async calculateStats() {
    let topScore = 0;
    let amountOfTopScore = 0;
    for (let player of this.players) {
      if (player.score > topScore) {
        topScore = player.score;
        amountOfTopScore = 1;
      } else if (player.score == topScore) {
        amountOfTopScore += 1;
      }
    }

    for (let player of this.players) {
      let stats = await User.findById(player.id, {stats: 1});
      if (stats.stats == undefined) {
        stats = {
          wins: 0,
          losses: 0,
          draws: 0,
          boxes: 0
        };
        await User.findByIdAndUpdate(player.id, {stats: {}});
      }
      console.log(player);
      console.log(stats);
      if (player.score == topScore && amountOfTopScore == 1) {
        await User.findByIdAndUpdate(player.id, {"stats.wins": (stats.stats.wins+1) || 1});
      } else if (player.score == topScore) {
        await User.findByIdAndUpdate(player.id, {"stats.draws": (stats.stats.draws+1) || 1});
      } else {
        await User.findByIdAndUpdate(player.id, {"stats.losses": (stats.stats.losses+1) || 1});
      }
    }
  }

  createLine(startPosition, endPosition, playerNumber) { //Creates a new line with the given coordinates
    if (startPosition[0] >= this.width || endPosition[0] >= this.width ||
        startPosition[1] >= this.height || endPosition[1] >= this.height ||
        Math.min(...startPosition) < 0 || Math.min(...endPosition) < 0) return;

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
        if (foundLinesTop.toString() == [true, true, true].toString()) {
          this.squares.push({
            topLeft: newLine.startPosition,
            player: playerNumber
          });
          this.players[playerNumber].score+=1;
        }
        if (foundLinesBottom.toString() == [true, true, true].toString()) {
          this.squares.push({
            topLeft: [newLine.startPosition[0],
            newLine.startPosition[1] - 1], player: playerNumber
          });
          this.players[playerNumber].score+=1;
        }
      } else { //Vertical line
        if (foundLinesRight.toString() == [true, true, true].toString()) {
          this.squares.push({
            topLeft: [newLine.startPosition[0] - 1,
            newLine.startPosition[1]], player: playerNumber
          });
          this.players[playerNumber].score+=1;
        }
        if (foundLinesLeft.toString() == [true, true, true].toString()) {
          this.squares.push({
            topLeft: [newLine.startPosition[0],
            newLine.startPosition[1]], player: playerNumber
          });
          this.players[playerNumber].score+=1;
        }

      }

      if (!(newLine.endPosition[1]==newLine.startPosition[1] && (foundLinesTop.toString()    == [true, true, true].toString() ||
          foundLinesBottom.toString() == [true, true, true].toString()) ||
          newLine.endPosition[1]!=newLine.startPosition[1] && (foundLinesRight.toString()  == [true, true, true].toString() ||
          foundLinesLeft.toString()   == [true, true, true].toString()))) {
          this.currentTurn = (this.currentTurn+1) % this.players.length;
       }

    }
    return doesntExist; //Returns boolean, if the new line was created or not
  }

  updatePlayerNames() {
    let players = [];
    for (let player of this.players) {
      let role = player.role;
      if (role==null) role = -1;
      players.push(
        {
          name: player.name || "Unknown player",
          number: player.number || 0,
          pattern: player.pattern,
          score: player.score || 0,
          wins: player.wins || 0,
          role: role
       });
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

module.exports.Game = Game;
module.exports.Line = Line;
