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
                table.playerSatOnTheTable(players[rec.seat], rec.seat, rec.chips );
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




