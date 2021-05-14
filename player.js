const COLOURS = ["red", "green", "yellow", "blue", "brown", "cyan", "lime", "orange", "gold", "pink", "purple"];

class Player {
  constructor(id, playerNum, admin, role, name) {
    this.id = id;
    this.number = playerNum;
    if (name == null) this.name = "Player "+(playerNum+1).toString();
    else this.name = name;
    if (role == null) this.role = -1;
    else this.role = role;
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
