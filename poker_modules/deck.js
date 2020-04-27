/**
 * The deck "class"
 */
var Deck = function() {
	this.nextCard = 0;
	this.cards = ['As', 'Ah', 'Ad', 'Ac',
                'Ks', 'Kh', 'Kd', 'Kc',
                'Qs', 'Qh', 'Qd', 'Qc',
                'Js', 'Jh', 'Jd', 'Jc',
                'Ts', 'Th', 'Td', 'Tc',
                '9s', '9h', '9d', '9c',
                '8s', '8h', '8d', '8c',
                '7s', '7h', '7d', '7c',
                '6s', '6h', '6d', '6c',
                '5s', '5h', '5d', '5c',
                '4s', '4h', '4d', '4c',
                '3s', '3h', '3d', '3c',
                '2s', '2h', '2d', '2c'];
};

// Method that shuffles the deck
Deck.prototype.shuffle = function(randomize){
  // Going back to the top of the deck
  this.nextCard = 0;
  if (!randomize) return;

  var shuffledDeck = [];

  for( var i=0 ; i<52 ; i++ ) {
      var random_card = this.cards.splice( Math.floor( Math.random() * this.cards.length ), 1 );
      shuffledDeck = shuffledDeck.concat( random_card );
  }
  this.cards = shuffledDeck;
};

// Method that returns the next x cards of the deck
Deck.prototype.getCard = function() {
    // nextCard would max 2*10 + 5.
    return(this.cards[this.nextCard++]);
};

module.exports = Deck;