'use strict';

const Player = require('../poker_modules/player.js');
const Table = require('../poker_modules/table.js');
const Utils = require('./utils.test.js');


beforeAll(async () => {
});

afterAll(() => {});


describe('Pot tests', () => {
    const t = Utils.setupDefaultTable();
    const table = t.table;
    const act = Utils.act;

    console.log("--------- Pre Flop -------------");
    act(table, 'smallBlind', 'A', 'SmallBlind');
    act(table, 'bigBlind', 'B', 'BigBlind');
    act(table, 'preflop', 'C', 'Call');
    act(table, 'preflop', 'D', 'Call');
    act(table, 'preflop', 'E', 'Call');
    act(table, 'preflop', 'F', 'Call');
    act(table, 'preflop', 'A', 'Call');
    act(table, 'preflop', 'B', 'Check');

    // --------- Flop -------------
    console.log("--------- Flop -------------");

    act(table, 'flop', 'A', 'Bet', 90);
    act(table, 'flop', 'B', 'Call');
    act(table, 'flop', 'C', 'Call');
    act(table, 'flop', 'D', 'Call');
    act(table, 'flop', 'E', 'Call');
    act(table, 'flop', 'F', 'Call');

    // --------- Turn -------------
    console.log("--------- Turn -------------");
    // Noaction A
    act(table, 'turn', 'B', 'Bet', 100);
    act(table, 'turn', 'C', 'Call');
    act(table, 'turn', 'D', 'Call');
    act(table, 'turn', 'E', 'Fold');
    act(table, 'turn', 'F', 'Call');


    // --------- River -------------
    console.log("--------- River -------------");
    // Noaction A
    // Noaction B
    act(table, 'river', 'C', 'Bet', 50);
    act(table, 'river', 'D', 'Call');
    // Noaction E
    // Don't play for F yet - otherwise the round gets over


    // At this time, there should be these pots:
    // Main Pot:    Amount: 600, Participants: A, B, C, D,    F
    // Side Pot 1:  Amount: 400, Participants:    B, C, D,    F
    // Side Pot 2:  Amount: 0, Participants:   none (this is yet to be calculated)
    
    test(`Check 3 pots`, async () => {
        expect(table.pot.pots.length).toEqual(3);
    });

    test(`Check contents of main pot`, async () => {
        expect(table.pot.pots[0].amount).toEqual(600);
        expect(table.pot.pots[0].contributors).toEqual([0, 1, 2, 3, 5]);
    });
    test(`Check contents of side pot 1`, async () => {
        expect(table.pot.pots[1].amount).toEqual(400);
        expect(table.pot.pots[1].contributors).toEqual([1, 2, 3, 5]);
    });
    test(`Check contents of side pot 2`, async () => {
        expect(table.pot.pots[2].amount).toEqual(0);
        expect(table.pot.pots[2].contributors).toEqual([]);
    });
    

    // --------- Round over -------------
    console.log("--------- Round over -------------");


});
