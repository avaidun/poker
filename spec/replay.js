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

var employees=[]
employees[0]={name:"George", age:32, retiredate:"March 12, 2014"}
employees[1]={name:"Edward", age:17, retiredate:"June 2, 2023"}
employees[2]={name:"Christine", age:58, retiredate:"December 20, 2036"}
employees[3]={name:"Sarah", age:62, retiredate:"April 30, 2020"}

function test(employees) {
    contributors = [];
    for (i in employees) {
        if (employees[i].age > 20) {
            contributors.push({name: employees[i].name, age: employees[i].age});
        }
    }
    contributors.sort(function(a, b){
        return b.age-a.age
    });
    console.log(contributors);
}

test(employees);

employees.sort();


async function processLineByLine() {
    const fileStream = fs.createReadStream('../rrevents/FullGameAARR.rr');

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
            case "startGame": // set the dealer seat and deck else it is randomized and will not be a true replay.
                table.public.dealerSeat = rec.dealerSeat;
                table.initializeRound(false);
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
                default:
                    console.log(`Line from file: ${str}`);
        }
        line++;
    }
}

processLineByLine();




