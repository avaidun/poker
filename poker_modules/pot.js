/**
 * The pot object
 */
var Pot = function() {
  // The pot may be split to several amounts, since not all players
  // have the same money on the table
  // Each portion of the pot has an amount and an array of the
  // contributors (players who have betted in the pot and can
  // win it in the showdown)
  this.pots = [
    { 
      amount: 0,
      contributors: []
    }
  ];
};

/**
 * Method that resets the pot to its initial state
 */
Pot.prototype.reset = function() {
  this.pots.length = 1;
  this.pots[0].amount = 0;
  this.pots[0].contributors = [];
};

/**
 * Method that gets the bets of the players and adds them to the pot
 * @param array players (the array of the tables as it exists in the table)
 */
Pot.prototype.addTableBets = function( players ) {
    // Getting the current pot (the one in which new bets should be added)
    var remaining = players.reduce((total, player) => total + (player ? player.public.bet : 0), 0);
    do {
        var currentPot = this.pots.length - 1;
        var sidePotRequired = false;
        const min = players.reduce(
            (min, player) => player && player.public.bet > 0 && player.public.bet < min ? player.public.bet : min, 
            remaining);

        for (const player of players) {
            if (player && player.public.bet > 0) {
                this.pots[currentPot].amount += min;
                player.public.bet -= min;
                sidePotRequired = player.public.chipsInPlay === 0 ? true : sidePotRequired
                remaining -= min;
                if (this.pots[currentPot].contributors.indexOf(player.seat) < 0 ) {
                    this.pots[currentPot].contributors.push(player.seat);
                }
            }
        }
        if (sidePotRequired) {
            if (this.pots[currentPot].contributors.length == 1) { //player put more than other players return the excess back to player
                let player = players[this.pots[currentPot].contributors[0]];
                player.wins(this.pots[currentPot].amount);
                if (this.pots.length > 1) {
                    this.pots.pop();
                }
            } else {        // Creating a sidepot if required
                this.pots.push({amount: 0, contributors: []});
            }
        }
    } while (remaining > 0);
}

Pot.prototype.distributeToWinners = function (players, firstPlayerToAct) {
    var messages = [];
  
    // For each one of the pots, starting from the first one
    for (const pot of this.pots) {
      var winners = [];
      var bestRating = 0;

      for (const player of players) {
        if (player && player.public.inHand && pot.contributors.includes(player.seat)) {
            if (player.evaluatedHand.rating > bestRating) {
              bestRating = player.evaluatedHand.rating;
              winners = [player];
            }
            else if ( player.evaluatedHand.rating === bestRating ) {
              winners.push(player);
            }
          }
      }

      if( winners.length === 1 ) {
        winners[0].wins(pot.amount);
        var htmlHand = '[' + winners[0].evaluatedHand.cards.join(', ') + ']';
        htmlHand = htmlHand.replace(/s/g, '&#9824;').replace(/c/g, '&#9827;').replace(/h/g, '&#9829;').replace(/d/g, '&#9830;');
        messages.push(winners[0].public.name + ' wins the pot (' + pot.amount + ') with ' + winners[0].evaluatedHand.name + ' ' + htmlHand );
      } else {
        var winnings = ~~(pot.amount / winners.length);
        var oddChip = pot.amount - (winnings * winners.length)

        var htmlHand = '';
        for (var j in winners) {
            players[winners[j].seat].wins(winnings + (j === 0 ? oddChip : 0));
            htmlHand += '[' + players[winners[j].seat].evaluatedHand.cards.join(', ') + '] ';
        }
        htmlHand = htmlHand.replace(/s/g, '&#9824;').replace(/c/g, '&#9827;').replace(/h/g, '&#9829;').replace(/d/g, '&#9830;');
        const winnerNames = winners.map(x => x.public.name).join(', ');
        messages.push( winnerNames + ' split the pot (' + pot.amount + ') ' + htmlHand );
      }
    }
  
    this.reset();
  
    return messages;
  }

/**
 * Method that gives the pot to the winner, if the winner is already known
 * (e.g. everyone has folded)
 * @param object  winner
 */
Pot.prototype.giveToWinner = function( winner ) {
  var potsCount = this.pots.length;
  var totalAmount = 0;

  //return the money that was bet.
  winner.wins(winner.public.bet);
  winner.public.bet = 0;

  for( var i=potsCount-1 ; i>=0 ; i-- ) {
    winner.wins(this.pots[i].amount);
    totalAmount += this.pots[i].amount;
  }

  this.reset();
  return winner.public.name + ' wins the pot (' + totalAmount + ')';
}

/**
 * Removing a player from all the pots
 * @param  number   seat
 */
Pot.prototype.removePlayer = function( seat ) {
  var potsCount = this.pots.length;
  for( var i=0 ; i<potsCount ; i++ ) {
    var placeInArray = this.pots[i].contributors.indexOf( seat );
    if( placeInArray >= 0 ) {
      this.pots[i].contributors.splice( placeInArray, 1 );
    }
  }
}

Pot.prototype.isEmpty = function() {
  return !this.pots[0].amount;
}


module.exports = Pot;