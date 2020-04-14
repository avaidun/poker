var Deck = require('./deck'),
	Pot = require('./pot');

// DEVELOPMENT PURPOSES
const fs = require('fs');
/**
 * The table "class"
 * @param string	id (the table id)
 * @param string	name (the name of the table)
 * @param object 	deck (the deck object that the table will use)
 * @param function 	eventEmitter (function that emits the events to the players of the room)
 * @param int 		seatsCount (the total number of players that can play on the table)
 * @param int 		bigBlind (the current big blind)
 * @param int 		smallBlind (the current smallBlind)
 * @param int 		maxBuyIn (the maximum amount of chips that one can bring to the table)
 * @param int 		minBuyIn (the minimum amount of chips that one can bring to the table)
 * @param bool 		privateTable (flag that shows whether the table will be shown in the lobby)
 */
var Table = function( id, name, eventEmitter, seatsCount, bigBlind, smallBlind, maxBuyIn, minBuyIn, privateTable, 
    defaultActionTimeout, minBet, recordReplayEnabled ) {
	// The table is not displayed in the lobby
	this.privateTable = privateTable;
	// The number of players who receive cards at the begining of each round
	this.playersSittingInCount = 0;
	// The number of players that currently hold cards in their hands
	this.playersInHandCount = 0;
	// Reference to the last player that will act in the current phase (originally the dealer, unless there are bets in the pot)
	this.lastPlayerToAct = null;
	// The game has only two players
	this.headsUp = false;
	// References to all the player objects in the table, indexed by seat number
	this.seats = [];
	// The deck of the table
	this.deck = new Deck;
	// The function that emits the events of the table
	this.eventEmitter = eventEmitter;
	// The pot with its methods
	this.pot = new Pot;
	this.recordReplayEnabled = recordReplayEnabled;
	// All the public table data
	this.public = {
		// The table id
		id: id,
		// The table name
		name: name,
		// The number of the seats of the table
		seatsCount: seatsCount,
		// The number of players that are currently seated
		playersSeatedCount: 0,
		// The big blind amount
		bigBlind: bigBlind,
		// The small blind amount
		smallBlind: smallBlind,
		// The minimum allowed buy in
		minBuyIn: minBuyIn,
		// The maximum allowed buy in
        maxBuyIn: maxBuyIn,
        // The timeout value for the defaul action when the player is afk
        defaultActionTimeout: defaultActionTimeout,
        // The minimum bet a player can raise by
        minBet: minBet,
		// The amount of chips that are in the pot
		pot: this.pot.pots,
		// The biggest bet of the table in the current phase
		biggestBet: 0,
		// The seat of the dealer
		dealerSeat: null,
		// The seat of the active player
		activeSeat: null,
		// The public data of the players, indexed by their seats
		seats: [],
		// The phase of the game ('smallBlind', 'bigBlind', 'preflop'... etc)
		phase: null,
		// The cards on the board
		board: ['', '', '', '', ''],
		// Log of an action, displayed in the chat
		log: {
			message: '',
			seat: '',
			action: ''
		},
		gameIsOn: false
	};
	// Initializing the empty seats
	for( var i=0 ; i<this.public.seatsCount ; i++ ) {
		this.seats[i] = null;
	}

	if (name === "REPLAY") this.recordReplayEnabled = false;
	if (this.recordReplayEnabled) {
		fn = "./rrevents/Table" + (new Date().toISOString().replace(/:/, '-').split(/:/)[0]) + "\.rr";
		this.ws = fs.createWriteStream(fn);
		this.ws.on('error', function(e) {
			console.error(e);
			this.recordReplayEnabled = false;
		});
	}
};

// The function that emits the events of the table
Table.prototype.emitEvent = function( eventName, eventData ){
	this.eventEmitter( eventName, eventData );
	this.public.log.message = '';
	this.public.log.action = '';
	this.public.log.seat = '';
	this.public.log.notification = '';
};

/**
 * Records the moves for development purposes
 * @param string rec
 */
Table.prototype.recordAndReplay = function(rec) {
	if (!this.recordReplayEnabled) return;
	rec.timeStamp = Date.now();
	this.ws.write(JSON.stringify(rec)+"\n");
}

/**
 * Finds the next player of a certain status on the table
 * @param  number offset (the seat where search begins)
 * @param  string|array status (the status of the player who should be found)
 * @return number|null
 */
Table.prototype.findNextPlayer = function( offset, status ) {
    return this.findPlayer(1, offset, status);
};


/**
 * Finds the previous player of a certain status on the table
 * @param  number offset (the seat where search begins)
 * @param  string|array status (the status of the player who should be found)
 * @return number|null
 */
Table.prototype.findPreviousPlayer = function( offset, status ) {
    return this.findPlayer(-1, offset, status);
};

/**
 * Worker function for findNextPlayer and findPreviousPlayer
 * @param  number direction (1: next player, -1: previous player)
 * @param  number offset (the seat where search begins)
 * @param  string|array status (the status of the player who should be found)
 * @return number|null
 */
Table.prototype.findPlayer = function(direction, offset, status) {
	offset = typeof offset !== 'undefined' ? offset : this.public.activeSeat;
    status = typeof status !== 'undefined' ? status : {
        'inHand': (x) => (x == true),
        'chipsInPlay': (x) => (x > 0)
    };

    for (var i = 0; i < this.public.seatsCount; i++) {
        var index = (offset + direction * (i + 1) + this.public.seatsCount) % this.public.seatsCount;
        if (this.seats[index] === null) {
            continue;
        }

        var validStatus = true;
        for (const key in status) {
            const func = status[key];
            validStatus &= (this.seats[index].public.hasOwnProperty(key) && func(this.seats[index].public[key]));
        }
        if (validStatus) {
            return(index);
        }
    }
    return (offset);
};


/**
 * Method that starts a new game
 */
Table.prototype.initializeRound = function( changeDealer ) {
	changeDealer = typeof changeDealer == 'undefined' ? true : changeDealer ;

	if( this.playersSittingInCount > 1 ) {
		// The game is on now
		this.public.gameIsOn = true;
		this.public.board = ['', '', '', '', ''];
		this.deck.shuffle();
		this.headsUp = this.playersSittingInCount === 2;
		this.playersInHandCount = 0;

		for( var i=0 ; i<this.public.seatsCount ; i++ ) {
			// If a player is sitting on the current seat
			if( this.seats[i] !== null && this.seats[i].public.sittingIn ) {
				if( !this.seats[i].public.chipsInPlay ) {
					// this.sittingOnTable = false;
					// this.seats[i].sitOut();
					// this.playersSittingInCount--;
					this.playerLeft(i);
				} else {
					this.playersInHandCount++;
					this.seats[i].prepareForNewRound();
				}
			}
		}

		// Giving the dealer button to a random player
		if( this.public.dealerSeat === null ) {
			var randomDealerSeat =  Math.ceil( Math.random() * this.playersSittingInCount );
			var playerCounter = 0;
			var i = -1;

			// Assinging the dealer button to the random player
			while( playerCounter !== randomDealerSeat && i < this.public.seatsCount ) {
				i++;
				if( this.seats[i] !== null && this.seats[i].public.sittingIn ) {
					playerCounter++;
				}
			}
			this.public.dealerSeat = i;
		} else if( changeDealer || this.seats[this.public.dealerSeat].public.sittingIn === false ) {
			// If the dealer should be changed because the game will start with a new player
			// or if the old dealer is sitting out, give the dealer button to the next player
			this.public.dealerSeat = this.findNextPlayer( this.public.dealerSeat );
		}

		// clear biggeet bet
		this.public.biggestBet = 0;

		this.recordAndReplay({
			action:'startGame',
			dealerSeat:this.public.dealerSeat,
			cards: this.deck.cards,
			players: this.public.seats
		});

		this.initializeSmallBlind();
	}
};

/**
 * Method that starts the "small blind" round
 */
Table.prototype.initializeSmallBlind = function() {
	// Set the table phase to 'smallBlind'
	this.public.phase = 'smallBlind';

	// If it's a heads up match, the dealer posts the small blind
	if( this.headsUp ) {
		this.public.activeSeat = this.public.dealerSeat;
	} else {
		this.public.activeSeat = this.findNextPlayer( this.public.dealerSeat );
	}
	this.lastPlayerToAct = 10;

	// Start asking players to post the small blind
	this.seats[this.public.activeSeat].socket.emit('postSmallBlind');
	this.emitEvent( 'table-data', this.public );
};

/**
 * Method that starts the "small blind" round
 */
Table.prototype.initializeBigBlind = function() {
	// Set the table phase to 'bigBlind'
	this.public.phase = 'bigBlind';
	this.actionToNextPlayer();
};

/**
 * Method that starts the "preflop" round
 */
Table.prototype.initializePreflop = function() {
	// Set the table phase to 'preflop'
	this.public.phase = 'preflop';
	var currentPlayer = this.public.dealerSeat;
	// The player that placed the big blind is the last player to act for the round
	this.lastPlayerToAct = this.public.activeSeat;

	for( var i=0 ; i<this.playersInHandCount ; i++ ) {
		this.seats[currentPlayer].cards = this.deck.deal( 2 );
		this.seats[currentPlayer].public.hasCards = true;
		this.seats[currentPlayer].socket.emit( 'dealingCards', this.seats[currentPlayer].cards );
		currentPlayer = this.findNextPlayer( currentPlayer );
	}

	this.actionToNextPlayer();
};

/**
 * Method that starts the next phase of the round
 */
Table.prototype.initializeNextPhase = function() {
	switch( this.public.phase ) {
		case 'preflop':
			this.public.phase = 'flop';
			this.public.board = this.deck.deal( 3 ).concat( ['', ''] );
			break;
		case 'flop':
			this.public.phase = 'turn';
			this.public.board[3] = this.deck.deal( 1 )[0];
			break;
		case 'turn':
			this.public.phase = 'river';
			this.public.board[4] = this.deck.deal( 1 )[0];
			break;
	}

	this.pot.addTableBets( this.seats );
	this.public.biggestBet = 0;
	this.public.activeSeat = this.findNextPlayer( this.public.dealerSeat );
	this.lastPlayerToAct = this.findPreviousPlayer( this.public.activeSeat );
	this.emitEvent( 'table-data', this.public );

	// If all other players are all in, there should be no actions. Move to the next round.
	if( this.otherPlayersAreAllIn() ) {
	    this.endPhase();
	} else {
		this.seats[this.public.activeSeat].socket.emit('actNotBettedPot');
	}
};

/**
 * Making the next player the active one
 */
Table.prototype.actionToNextPlayer = function() {
    this.public.activeSeat = this.findNextPlayer(this.public.activeSeat);

	switch( this.public.phase ) {
		case 'smallBlind':
			this.seats[this.public.activeSeat].socket.emit( 'postSmallBlind' );
			break;
		case 'bigBlind':
			this.seats[this.public.activeSeat].socket.emit( 'postBigBlind' );
			break;
		case 'preflop':
			if( this.otherPlayersAreAllIn() ) {
				this.seats[this.public.activeSeat].socket.emit( 'actOthersAllIn' );
			} else {
				this.seats[this.public.activeSeat].socket.emit( 'actBettedPot' );
			}
			break;
		case 'flop':
		case 'turn':
		case 'river':
			// If someone has betted
			if( this.public.biggestBet ) {
				if( this.otherPlayersAreAllIn() ) {
					this.seats[this.public.activeSeat].socket.emit( 'actOthersAllIn' );
				} else {
					this.seats[this.public.activeSeat].socket.emit( 'actBettedPot' );
				}
			} else {
				this.seats[this.public.activeSeat].socket.emit( 'actNotBettedPot' );
			}
			break;
	}

	this.emitEvent( 'table-data', this.public );
};

/**
 * The phase when the players show their hands until a winner is found
 */
Table.prototype.showdown = function() {
	this.pot.addTableBets( this.seats );

	var currentPlayer = this.findNextPlayer( this.public.dealerSeat, {'inHand': (x) => x} );
	var bestHandRating = 0;

	for( var i=0 ; i<this.playersInHandCount ; i++ ) {
		this.seats[currentPlayer].evaluateHand( this.public.board );
		// If the hand of the current player is the best one yet,
		// he has to show it to the others in order to prove it
		if( this.seats[currentPlayer].evaluatedHand.rating > bestHandRating ) {
			this.seats[currentPlayer].public.cards = this.seats[currentPlayer].cards;
		}
		currentPlayer = this.findNextPlayer( currentPlayer, {'inHand': (x) => x} );
	}
	
	var messages = this.pot.distributeToWinners( this.seats, currentPlayer );

	var messagesCount = messages.length;
	for( var i=0 ; i<messagesCount ; i++ ) {
		this.log(messages[i]);
	}

	var that = this;
	setTimeout( function(){
		that.endRound();
    }, 10000 );

    return (messages); // for unit tests
};

/**
 * Ends the current phase of the round
 */
Table.prototype.endPhase = function() {
	switch( this.public.phase ) {
		case 'preflop':
		case 'flop':
		case 'turn':
			this.initializeNextPhase();
			break;
		case 'river':
			this.showdown();
			break;
	}
};

/**
 * When a player posts the small blind
 * @param int seat
 */
Table.prototype.playerPostedSmallBlind = function() {
	var bet = this.seats[this.public.activeSeat].public.chipsInPlay >= this.public.smallBlind ? this.public.smallBlind : this.seats[this.public.activeSeat].public.chipsInPlay;
	this.seats[this.public.activeSeat].bet( bet );
	this.public.biggestBet = this.public.biggestBet < bet ? bet : this.public.biggestBet;
	this.log(this.seats[this.public.activeSeat].public.name + ' posted the small blind',
		'smallBlind', 'Posted blind');
	this.initializeBigBlind();
};

/**
 * When a player posts the big blind
 * @param int seat
 */
Table.prototype.playerPostedBigBlind = function() {
	var bet = this.seats[this.public.activeSeat].public.chipsInPlay >= this.public.bigBlind ? this.public.bigBlind : this.seats[this.public.activeSeat].public.chipsInPlay;
    this.seats[this.public.activeSeat].bet( bet );
	this.public.biggestBet = this.public.biggestBet < bet ? bet : this.public.biggestBet;
	this.log(this.seats[this.public.activeSeat].public.name + ' posted the big blind',
		'bigBlind', 'Posted blind');
	this.initializePreflop();
};

/**
 * Checks if the round should continue after a player has folded
 */
Table.prototype.playerFolded = function() {
	this.seats[this.public.activeSeat].fold();
	this.log(this.seats[this.public.activeSeat].public.name + ' folded',
		'fold', 'Fold');

	this.playersInHandCount--;
	this.pot.removePlayer( this.public.activeSeat );
	if( this.playersInHandCount <= 1 ) {
		this.pot.addTableBets( this.seats );
		var winnersSeat = this.findNextPlayer();
		this.pot.giveToWinner( this.seats[winnersSeat] );
		this.endRound();
	} else {
		if( this.lastPlayerToAct == this.public.activeSeat ) {
			this.endPhase();
		} else {
			this.actionToNextPlayer();
		}
	}
};

/**
 * When a player checks
 */
Table.prototype.playerChecked = function() {
	this.log(this.seats[this.public.activeSeat].public.name + ' checked',
		'check', 'Check');

	if( this.lastPlayerToAct === this.public.activeSeat ) {
		this.endPhase();
	} else {
		this.actionToNextPlayer();
	}
};

/**
 * When a player calls
 */
Table.prototype.playerCalled = function() {
	var calledAmount = this.public.biggestBet - this.seats[this.public.activeSeat].public.bet;
	this.seats[this.public.activeSeat].bet( calledAmount );

	this.log(this.seats[this.public.activeSeat].public.name + ' called',
		'call', 'Call');

    //if( this.lastPlayerToAct === this.public.activeSeat || this.otherPlayersAreAllIn() ) {
	if( this.lastPlayerToAct === this.public.activeSeat ) {
		this.endPhase();
	} else {
		this.actionToNextPlayer();
	}
};

/**
 * When a player bets
 */
Table.prototype.playerBetted = function( amount ) {
	this.seats[this.public.activeSeat].bet( amount );
	this.public.biggestBet = this.public.biggestBet < this.seats[this.public.activeSeat].public.bet ? this.seats[this.public.activeSeat].public.bet : this.public.biggestBet;

	this.log(this.seats[this.public.activeSeat].public.name + ' betted ' + amount,
		'bet', 'Bet ' + amount);

	var previousPlayerSeat = this.findPreviousPlayer();
	if( previousPlayerSeat === this.public.activeSeat ) {
		this.endPhase();
	} else {
		this.lastPlayerToAct = previousPlayerSeat;
		this.actionToNextPlayer();
	}
};

/**
 * When a player raises
 */
Table.prototype.playerRaised = function( amount ) {
	this.seats[this.public.activeSeat].raise( amount );
	var oldBiggestBet = this.public.biggestBet;
	this.public.biggestBet = this.public.biggestBet < this.seats[this.public.activeSeat].public.bet ? this.seats[this.public.activeSeat].public.bet : this.public.biggestBet;
	var raiseAmount = this.public.biggestBet - oldBiggestBet;
	this.log(this.seats[this.public.activeSeat].public.name + ' raised to ' + this.public.biggestBet,
		'raise', 'Raise ' + raiseAmount);

	var previousPlayerSeat = this.findPreviousPlayer();
	if( previousPlayerSeat === this.public.activeSeat ) {
		this.endPhase();
	} else {
		this.lastPlayerToAct = previousPlayerSeat;
		this.actionToNextPlayer();
	}
};

/**
 * Adds the player to the table
 * @param object 	player
 * @param int 		seat
 */
Table.prototype.playerSatOnTheTable = function( player, seat, chips ) {

	this.seats[seat] = player;
	this.public.seats[seat] = player.public;

	this.seats[seat].sitOnTable( this.public.id, seat, chips );

	// Increase the counters of the table
	this.public.playersSeatedCount++;
	
	this.playerSatIn( seat );
};

/**
 * Adds a player who is sitting on the table, to the game
 * @param int seat
 */
Table.prototype.playerSatIn = function( seat ) {
	// The player is sitting in
	this.seats[seat].public.sittingIn = true;
	this.playersSittingInCount++;

	this.log(this.seats[seat].public.name + ':sat in','sat', seat + ' ' + this.public.chipsInPlay, '');
};

/**
 * Start a game if there are more than 2 players
 */
Table.prototype.startGame = function() {
	if( !this.public.gameIsOn && this.playersSittingInCount > 1 ) {
		// Initialize the game
		this.initializeRound( false );
		this.emitEvent('startGame', this.public );
		return true;
	}
	return false;
}

/**
 * Changes the data of the table when a player leaves
 * @param int seat
 */
Table.prototype.playerLeft = function( seat ) {
	// If someone is really sitting on that seat
	if( this.seats[seat].public.name ) {
		var nextAction = '';

		// If the player is sitting in, make them sit out first
		if( this.seats[seat].public.sittingIn ) {
			this.playerSatOut( seat, true );
		}

		this.seats[seat].leaveTable();

		// Empty the seat
		this.public.seats[seat] = {};
		this.public.playersSeatedCount--;

		// If there are not enough players to continue the game
		if( this.public.playersSeatedCount < 2 ) {
			this.public.dealerSeat = null;
		}

		this.log(this.seats[seat].public.name + ' left:' + seat, 'left');

		this.seats[seat] = null;
		if (!this.public.gameIsOn) {
			return
		}
		// If a player left a heads-up match and there are people waiting to play, start a new round
		if( this.playersInHandCount < 2) {
			this.endRound();
		}
		// Else if the player was the last to act in this phase, end the phase
		else if( this.lastPlayerToAct === seat && this.public.activeSeat === seat ) {
			this.endPhase();
		}
	}
};

/**
 * Changes the data of the table when a player sits out
 * @param int 	seat 			(the numeber of the seat)
 * @param bool 	playerLeft		(flag that shows that the player actually left the table)
 */
Table.prototype.playerSatOut = function( seat, playerLeft ) {
	// Set the playerLeft parameter to false if it's not specified
	if( typeof playerLeft == 'undefined' ) {
		playerLeft = false;
	}

	// If the player didn't leave, log the action as "player sat out"
	if( !playerLeft ) {
		this.log(this.seats[seat].public.name + ' sat out');
	}

	// If the player had betted, add the bets to the pot
	if( this.seats[seat].public.bet ) {
		this.pot.addPlayersBets( this.seats[seat] );
	}
	this.pot.removePlayer( this.public.activeSeat );

	var nextAction = '';
	this.playersSittingInCount--;

	if( this.seats[seat].public.inHand ) {
		this.seats[seat].sitOut();
		this.playersInHandCount--;

		if( this.playersInHandCount < 2 ) {
			if( !playerLeft ) {
				this.endRound();
			}
		} else {
			// If the player was not the last player to act but they were the player who should act in this round
			if( this.public.activeSeat === seat && this.lastPlayerToAct !== seat ) {
				this.actionToNextPlayer();
			}
			// If the player was the last player to act and they left when they had to act
			else if( this.lastPlayerToAct === seat && this.public.activeSeat === seat ) {
				if( !playerLeft ) {
					this.endPhase();
				}
			}
			// If the player was the last to act but not the player who should act
			else if ( this.lastPlayerToAct === seat ) {
				this.lastPlayerToAct = this.findPreviousPlayer( this.lastPlayerToAct );
			}
		}
	} else {
		this.seats[seat].sitOut();
	}
	this.emitEvent( 'table-data', this.public );
};

Table.prototype.otherPlayersAreAllIn = function() {
	// Check if the players are all in
	var currentPlayer = this.public.activeSeat;
	var playersAllIn = 0;
	for( var i=0 ; i<this.playersInHandCount ; i++ ) {
	    if (this.seats[currentPlayer] === undefined)
	        console.log("Error")
		if( this.seats[currentPlayer].public.chipsInPlay === 0 ) {
			playersAllIn++;
		}
        currentPlayer = this.findNextPlayer( currentPlayer, {'inHand': (x) => x} );
	}

	// In this case, all the players are all in. There should be no actions. Move to the next round.
	return playersAllIn >= this.playersInHandCount-1;
};

/**
 * Method that makes the doubly linked list of players
 */
Table.prototype.removeAllCardsFromPlay = function() {
	// For each seat
	for( var i=0 ; i<this.public.seatsCount ; i++ ) {
		// If a player is sitting on the current seat
		if( this.seats[i] !== null ) {
			this.seats[i].cards = [];
			this.seats[i].public.hasCards = false;
		}
	}
};

/**
 * Actions that should be taken when the round has ended
 */
Table.prototype.endRound = function() {
	// If there were any bets, they are added to the pot
	this.pot.addTableBets( this.seats );
	if( !this.pot.isEmpty() ) {
		var winnersSeat = this.findNextPlayer( 0, {'inHand': (x) => x} );
		this.pot.giveToWinner( this.seats[winnersSeat] );
	}

	// Sitting out the players who don't have chips
	for( i=0 ; i<this.public.seatsCount ; i++ ) {
		if( this.seats[i] !== null && this.seats[i].public.chipsInPlay <=0 && this.seats[i].public.sittingIn ) {
			// this.sittingOnTable = false;
			// this.seats[i].sitOut();
			// this.playersSittingInCount--;
			this.playerLeft(i);
		}
	}

	// If there are not enough players to continue the game, stop it
	if( this.playersSittingInCount < 2 ) {
		this.stopGame();
	} else {
		this.initializeRound();
	}
};

/**
 * Method that stops the game
 */
Table.prototype.stopGame = function() {
	this.public.phase = null;
	this.pot.reset();
	this.public.activeSeat = null;
	this.public.board = ['', '', '', '', ''];
	this.lastPlayerToAct = null;
	this.removeAllCardsFromPlay();
	this.public.gameIsOn = false;
	this.emitEvent( 'gameStopped', this.public );
};

/**
 * Logs the last event
 */
Table.prototype.log = function(message, action, notification, seat) {
	this.public.log.message = message;
	this.public.log.action = (action === 'undefined') ? '' : action;
	this.public.log.seat = (seat === 'undefined') ? this.public.activeSeat : seat;
	this.public.log.notification = (notification === 'undefined') ? '' : notification;

	this.recordReplayEnabled && this.recordAndReplay(this.public.log);
	this.emitEvent( 'table-data', this.public );
}

module.exports = Table;