
var Player = require('../poker_modules/player.js');
var Table = require('../poker_modules/table.js');

const eventEmitter = function( tableId ) {
	return function ( eventName, eventData ) {
	}
}

const socket = {
	emit: function() {
		return;
	}
};

const testTableId = 0;
var players = [];

const setupDefaultTable = function() {
    // Read configuration from the config file and create table appropriately
    const fs = require('fs');
    try {
        const data = fs.readFileSync('./config/config.json', 'utf-8');

        config = JSON.parse(data);

        const testPlayers = [
            {name: 'A', chips: 100, seat: 0, cards: ['Ks', 'Qs']},
            {name: 'B', chips: 200, seat: 1, cards: ['Kh', 'Qh']},
            {name: 'C', chips: 300, seat: 2, cards: ['Kd', 'Qd']},
            {name: 'D', chips: 400, seat: 3, cards: ['Kc', 'Qc']},
            {name: 'E', chips: 500, seat: 4, cards: ['3s', '2s']},
            {name: 'F', chips: 500, seat: 5, cards: ['3h', '2h']}
        ];
        const communityCards = ['Ah', 'Jh', 'Th', '9h', '8h'];

        return(this.setupTable(config.tables[0], testPlayers, communityCards));
    } catch (err) {
        console.error("please update config.json")
        return
    }
}

const setupTable = function(tableSpecs, testPlayers, communityCards) {
    var testTable;

    testTable = new Table( testTableId, tableSpecs.name, eventEmitter(testTableId), 
        tableSpecs.numPlayers, 2 * tableSpecs.smallBlind, tableSpecs.smallBlind, 
        tableSpecs.maxBuyIn, tableSpecs.minBuyIn, tableSpecs.isPrivate,
        tableSpecs.defaultActionTimeout, tableSpecs.minBet);

    var cnt = 0;
    for (var p of testPlayers) {
        players[cnt] = new Player(socket, p.name, p.chips);
        players[cnt].socket = socket; 
        testTable.playerSatOnTheTable(players[cnt], p.seat, p.chips);
        testTable.deck.cards = testTable.deck.cards.concat(testPlayers[cnt].cards)
    }
    testTable.deck.cards = testTable.deck.cards.concat(communityCards);

    // Hack to force a specific dealer instead of a random one so A becomes low-blind
    testTable.public.dealerSeat = testPlayers.length - 1;
    testTable.startGame();

    return ({table: testTable, players: players});
}


const act = function (table, phase, name, action, amount) {
    var actualPhase = table.public.phase;
    test(`Expect phase to match the expectation:`, async () => {
        expect(phase).toEqual(actualPhase);
    });

    var actualName = table.public.seats[table.public.activeSeat].name;
    test(`Expect name to match the expectation:`, async () => {
        expect(name).toEqual(actualName);
    });

    switch(action) {
        case 'LowBlind':
        case 'SmallBlind':
            table.playerPostedSmallBlind()
            break;
        case 'HighBlind':
        case 'BigBlind':
            table.playerPostedBigBlind();
            break;
        case 'Check':
            table.playerChecked();
            break;
        case 'Bet':
            if (amount == undefined) {
                console.log(`Amount=${amount} is not defined for a bet`);
            } else {
                table.playerBetted(amount);
            }
            break;
        case 'Raise':
            if (amount == undefined) {
                console.log(`Amount=${amount} is not defined for a raise`);
            } else {
                table.playerRaised(amount);
            }
            break;
        case 'Fold':
            table.playerFolded();
            break;
        case 'Call':
            table.playerCalled();
            break;
        default:
            console.log(`Unknown action: ${action}`);
    }   
}

module.exports = {
    eventEmitter: eventEmitter,
    socket: socket,
    setupDefaultTable: setupDefaultTable,
    setupTable: setupTable,
    act: act
}
