const COLOURS = ["red", "green", "yellow", "blue", "brown", "cyan", "lime", "orange", "gold", "pink", "purple"];

class Player {
  constructor(id, playerNum, admin) {
    this.id = id;
    this.number = playerNum;
    this.name = "Player "+(playerNum+1).toString();
    this.score = 0;
    this.wins = 0;
    this.pattern = {
      pattern: playerNum % 2 + 1,
      colour: COLOURS[playerNum % COLOURS.length]
    };
    this.admin = admin;
  }
}

module.exports.Player = Player;
