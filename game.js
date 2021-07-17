const mongoose = require('mongoose');
const User = require('./models/User');

class Game {
  constructor(room) {
    this.room = room;

    this.lines = {};

    this.shapes = [];
    this.players = [];
    this.currentTurn = 0;
    this.winCounted = false;
    this.firstPlayerTurn = this.currentTurn;
    this.nextPlayerNumber = 1; //First player number

    this.settings = {
      width: 5,
      height: 5,
      gamemode: 1
    }

    this.nextSettings = Object.assign({}, this.settings);
    this.roundStarted = false;
    this.timeouts = [];
  }

  restart() {
      this.lines = {};
      this.shapes = [];
      this.firstPlayerTurn = (this.firstPlayerTurn + 1) % this.players.length;
      this.currentTurn = this.firstPlayerTurn;
      this.winCounted = false;
      this.roundStarted = false;

      this.settings = Object.assign({}, this.nextSettings);
      for (let player of this.players) player.score = 0;
  }

  get finished() {
    let finished = this.shapes.length >= (this.settings.width-1) * (this.settings.height-1);

    if (this.settings.gamemode == 2) {
      finished = this.shapes.length >= (this.settings.width-1) * (this.settings.width-1);
    }

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

  async calculateStats() { //Calculates stat changes and adds to database
    let topScore = 0;
    let amountOfTopScore = 0;
    for (let player of this.players) {
      if (player.score > topScore) { //Calculating winning score, and how many players had the winning score
        topScore = player.score;
        amountOfTopScore = 1;
      } else if (player.score == topScore) {
        amountOfTopScore += 1;
      }
    }

    for (let player of this.players) { //Adds stats to each player
      if (player.role==-1) continue; //Role is -1 for players who aren't logged in, so no stats need to be logged
      let stats = await User.findById(player.id, {stats: 1}); //Fetch the stats of this player

      if (stats.stats === undefined) stats.stats = {}; //Add an empty object if the stats are undefined
      stats.stats.boxes = (stats.stats.boxes + player.score) || player.score || 0; //Add to the "boxes" stats

      if (player.score == topScore && amountOfTopScore == 1) {
        stats.stats.wins = (stats.stats.wins + 1) || 1;
      } else if (player.score == topScore) {
        stats.stats.draws = (stats.stats.draws + 1) || 1;
      } else {
        stats.stats.losses = (stats.stats.losses + 1) || 1;
      }
      stats.markModified('stats'); //Tells Mongoose that the stats object has changed
      await stats.save(); //Save changes to database
    }
  }

  checkShape(startPosition, endPosition, player, depth, visitedPoints) {
    if (depth == null) {
      if (this.settings.gamemode == 2) { //Triangle mode
        depth = 2;
      } else {
        depth = 3; //Square mode (Default)
      }
    }
    if (visitedPoints == null) visitedPoints = [startPosition];

    if (depth <= 0) {
      if (startPosition.toString() == endPosition.toString()) {
        this.boxFormed = true;
        this.players[player].score += 1;

        this.shapes.push({
          points: visitedPoints,
          player: player
        });
      }
    } else {
      let node = this.lines[startPosition];
      for (let childNode of node) {
        if (childNode.toString() == startPosition.toString()) continue;
        let notVisited = true;
        for (let visitedNode of visitedPoints) {
          if (childNode.toString() == visitedNode.toString()) notVisited = false;
        }

        if (notVisited) {
          this.checkShape(childNode, endPosition, player, depth - 1, visitedPoints.concat([childNode]));
        }
      }
    }
  }

  createLine(startPosition, endPosition, playerNumber) {
    this.boxFormed = false;
    let lineFormed = false;

    //Exit early if line already exists
    if (this.lines[startPosition] && endPosition in this.lines[startPosition]) return false;
    //Exit early if line is invalid
    if (startPosition.toString() == endPosition.toString()) return false;

    let distanceX = startPosition[0] - endPosition[0];
    let distanceY = startPosition[1] - endPosition[1];

    if (this.settings.gamemode == 1 && !(Math.abs(distanceX) + Math.abs(distanceY) == 1)) return false;

    let validDirection = Math.abs(distanceX) + Math.abs(distanceY) == 1 || (distanceX == 1 && distanceY == 1) || (distanceX == -1 && distanceY == -1);
    let onboardCheck1 = Math.min(...startPosition) >= 0 && Math.min(...endPosition) >= 0;
    let onboardCheck2 = startPosition[1] < this.settings.width && endPosition[1] < this.settings.width;
    let onboardCheck3 = startPosition[0] <= startPosition[1] && endPosition[0] <= endPosition[1];
    if (this.settings.gamemode == 2 && !(validDirection && onboardCheck1 && onboardCheck2 && onboardCheck3)) return false;


    if (!this.lines[startPosition]) {
      lineFormed = true;
      this.lines[startPosition] = [endPosition];
    } else {
      let exists = false;
      for (let position of this.lines[startPosition]) {
        if (position.toString() == endPosition.toString()) exists = true;
      }
      if (!exists) {
        lineFormed = true;
        this.lines[startPosition].push(endPosition);
      }
    }

    if (!this.lines[endPosition]) {
      lineFormed = true;
      this.lines[endPosition] = [startPosition];
    } else {
      let exists = false;
      for (let position of this.lines[endPosition]) {
        if (position.toString() == startPosition.toString()) exists = true;
      }
      if (!exists) {
        lineFormed = true;
        this.lines[endPosition].push(startPosition);
      }
    }

    if (lineFormed) {
      this.checkShape(startPosition, endPosition, playerNumber);
      this.roundStarted = true;
      if (!this.boxFormed) this.currentTurn = (this.currentTurn+1) % this.players.length;
    }
    return true;

  }

  updatePlayerNames() {
    let players = [];
    for (let player of this.players) {
      let role = player.role;
      if (role==null) role = -1;

      let disconnectTimeout = null;
      if (player.disconnectedAt != null) disconnectTimeout = process.env.DISCONNECT_TIMEOUT - (new Date() - player.disconnectedAt) / 1000;
      players.push(
        {
          name: player.name || "Unknown player",
          number: player.number || 0,
          pattern: player.pattern,
          score: player.score || 0,
          wins: player.wins || 0,
          role: role,
          disconnectTimeout: disconnectTimeout
       });
    }
    return players;
  }
}


module.exports.Game = Game;
