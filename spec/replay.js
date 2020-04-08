const fs = require('fs');
const readline = require('readline');

var Player = require('../poker_modules/player.js');
var Table = require('../poker_modules/table.js');


var table,
    players = [],
    initialChips = 0;

var eventEmitter = function( tableId ) {
    return function (eventName, eventData) {
    };
};

var socket = {
    emit: function () {
        return;
    }
};



table = new Table( 0, 'REPLAY', eventEmitter(0), 10, 2, 1, 200, 40, false );

// i = 10;
//
// var x = {
//     action: eventEmitter(0),
//     action2: eventEmitter(i)
// }
//
// var str = JSON.stringify(x);

async function processLineByLine() {
    const fileStream = fs.createReadStream('../rrevents/Sample 10-handed Table-1.rr');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    for await (const rec of rl) {
        // Each line in input.txt will be successively available here as `line`.
        console.log(`Line from file: ${rec}` + str);
        switch (rec.action) {
            case "startGame": // set the dealer seat and deck else it is randomized and will not be a true replay.
                table.public.dealerSeat = rec.dealerSeat;
                table.deck.cards = rec.cards;
                break;
            case "playerPostedSmallBlind":
                table.playerPostedSmallBlind();
                break;
            case "playerPostedBigBlind":
                table.playerPostedBigBlind();
                break;
            case "playerFolded":
                table.playerFolded();
                break;
            case "playerChecked":
                table.playerChecked();
                break;
            case "playerCalled":
                table.playerCalled();
                break;
            case "playerBetted":
                table.playerBetted();
                break;
            case "playerBetted":
                table.playerBetted(rec.amount);
                break;
            case "playerRaised":
                table.playerRaised(rec.amount);
                break;
            case "playerSatOnTheTable":
                players[rec.seat] = new Player( socket, rec.name, rec.chips );
                table.playerSatOnTheTable( players[playercnt], rec.seat, rec.chips );
                playercnt++;
                break;
            case "playerLeft":
                table.playerLeft(rec.seat);
                players[rec.seat] = null;
                break;
            case "playerSatOut":
                table.playerSatOut(rec.seat, rec.playerLeft);
                break;

                default:
                    console.log(`Line from file: ${rec}` + str);
        }
    }
}

processLineByLine();

for( var i=0 ; i<3 ; i++ ) {
    players[i] = new Player( socket, 'Player_'+i, 1000 );
    players[i].socket = socket;

}

initialChips = 200;
table.playerSatOnTheTable( players[0], 2, initialChips );
table.playerSatOnTheTable( players[1], 6, initialChips );
table.playerSatOnTheTable( players[2], 4, initialChips );

table.deck.cards[0] = 'Ah';
table.deck.cards[1] = 'Kh';

table.deck.cards[2] = 'Ad';
table.deck.cards[3] = 'Kd';

table.deck.cards[4] = 'As';
table.deck.cards[5] = 'Ks';

table.deck.cards[6] = '3c';
table.deck.cards[7] = '5c';
table.deck.cards[8] = '8c';
table.deck.cards[9] = 'Js';
table.deck.cards[10] = 'Qd';

table.startGame();
table.playerPostedSmallBlind();
table.playerPostedBigBlind();
table.playerCalled();
table.playerChecked();
table.playerChecked();
table.playerChecked();
table.playerChecked();
table.playerChecked();
table.playerChecked();
table.playerChecked();

// jasmine.Clock.tick(2000);

table.deck.cards[0] = 'Ah';
table.deck.cards[1] = 'Kh';

table.deck.cards[2] = 'Ad';
table.deck.cards[3] = 'Kd';

table.deck.cards[4] = 'As';
table.deck.cards[5] = 'Ks';

table.deck.cards[6] = '3c';
table.deck.cards[7] = '5c';
table.deck.cards[8] = '8c';
table.deck.cards[9] = 'Js';
table.deck.cards[10] = 'Qd';

table.playerPostedSmallBlind();
table.playerPostedBigBlind();
table.playerCalled();
table.playerCalled();
table.playerChecked();
table.playerBetted( 33 );
table.playerCalled();
table.playerCalled();
table.playerChecked();
table.playerChecked();
table.playerChecked();
table.playerChecked();
table.playerChecked();



