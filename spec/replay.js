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

table = new Table( 0, 'REPLAY', eventEmitter(0), 10, 10, 5, 500, 50, false, 3000000, 10);

async function processLineByLine() {
    const fileStream = fs.createReadStream('../rrevents/Table2020-04-20T06-16.rr');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    // Note: we use the crlfDelay option to recognize all instances of CR LF
    // ('\r\n') in input.txt as a single line break.

    var line = 1;
    for await (const str of rl) {
        // Each line in input.txt will be successively available here as `line`.
        rec = JSON.parse(str);
        console.log(`Line from file: ${str}` + " dealer " + table.public.dealerSeat + " Active " + table.public.activeSeat);
        switch (rec.action) {
            case 'gameStarted': // set the dealer seat and deck else it is randomized and will not be a true replay.
                table.public.dealerSeat = rec.dealerSeat;
                table.initializeRound(false);
                table.deck.cards = rec.cards;
                break;
            case 'fold':
                table.playerFolded();
                break;
            case 'check':
                table.playerChecked();
                break;
            case 'call':
                table.playerCalled();
                break;
            case 'bet':
                table.playerBetted(parseInt(rec.notification.split(' ')[1]));
                break;
            case 'raise':
                table.playerRaised(parseInt(rec.notification.split(' ')[1]));
                break;
            case 'sat':
                seat = parseInt(rec.notification.split(' ')[0]);
                chips = parseInt(rec.notification.split(' ')[1]);
                players[seat] = new Player( socket, rec.message.split(':')[0], chips );
                table.playerSatOnTheTable(players[seat], seat, chips );
                break;
            case 'left':
                seat = parseInt(rec.message.split(':')[1]);
                table.playerLeft(seat);
                players[seat] = null;
                break;
                default:
                    console.log(`Line from file: ${str}`);
        }
        line++;
    }
}

processLineByLine();




