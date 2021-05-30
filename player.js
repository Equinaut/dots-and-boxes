const COLOURS = ["red", "green", "yellow", "blue", "brown", "cyan", "lime", "orange", "gold", "pink", "purple"];

class Player {
  constructor(id, playerNum, nextPlayerNum, admin, role, name) {
    this.id = id;

    this.number = playerNum;

    if (name == null) this.name = "Player "+(nextPlayerNum).toString();
    else this.name = name;
    if (role == null) this.role = -1;
    else this.role = role;
    this.score = 0;
    this.wins = 0;
    this.pattern = {
      pattern: (nextPlayerNum+1) % 2 + 1,
      colour: COLOURS[(nextPlayerNum-1) % COLOURS.length]
    };

    this.admin = admin;

    this.connectedClients = 1;
  }
}

module.exports.Player = Player;
