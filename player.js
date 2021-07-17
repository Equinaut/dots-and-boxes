const COLOURS = ["red", "green", "yellow", "blue", "brown", "cyan", "lime", "orange", "gold", "pink", "purple"];

class Player {
  constructor(id, playerNum, nextPlayerNum, admin, role, name, pattern) {
    this.id = id;

    this.number = playerNum;

    if (name == null) this.name = "Player "+(nextPlayerNum).toString();
    else this.name = name;
    if (role == null) this.role = -1;
    else this.role = role;
    this.score = 0;
    this.wins = 0;

    if (pattern == null) {
      this.pattern = {
        pattern: 1,
        colour: COLOURS[(nextPlayerNum-1) % COLOURS.length]
      };
    } else {
      this.pattern = pattern;
    }

    this.admin = admin;

    this.connectedClients = 1;
    this.disconnectedAt = null; //Time at which the user disconnected if they disconnect during a game
  }
}

module.exports.Player = Player;
