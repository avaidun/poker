'use strict';

const Player = require('../poker_modules/player.js');
const Table = require('../poker_modules/table.js');
const Utils = require('./utils.test.js');


beforeAll(async () => {
});

afterAll(() => {});


describe('Pot creation tests', () => {
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

describe('Pot distribution tests', () => {
    test(`One winner per pot`,  () => {
        const t = Utils.setupDefaultTable();
        const table = t.table;

        table.seats[0].cards = ['As', 'Ah'];
        table.seats[1].cards = ['Kd', 'Kc'];
        table.seats[2].cards = ['Qs', 'Qh'];
        table.seats[3].cards = ['Jd', 'Jc'];
        table.seats[4].cards = ['Ts', 'th'];
        table.seats[5].cards = ['9d', '9c'];

        table.public.board = ['9s', 'Js', '2s', '2h', '3s'];
        table.pot.pots = [
            {amount: 100, contributors: [0, 1, 2, 3, 4, 5]},
            {amount: 150, contributors: [0, 1, 2]},
            {amount: 200, contributors: [1, 2]}
        ];

        const messages = table.showdown();

        // Base pot: winner - 3 (D): should get 100
        // Side pot-1: winner - 0 (A): should get 150
        // Side pot-2: winner - 2 (C): should get 200
        expect(messages.length).toEqual(3);
        expect(messages[0])
            .toMatch("D wins the pot (100) with a full house, jacks full of deuces");
        expect(messages[1])
            .toMatch("A wins the pot (150) with a flush, ace high");
        expect(messages[2])
            .toMatch("C wins the pot (200) with a flush, queen high");
    });

    test(`Multiple winners - split pot`,  () => {
        const t = Utils.setupDefaultTable();
        const table = t.table;
        
        table.seats[0].cards = ['As', '5s'];
        table.seats[1].cards = ['Ah', '5h'];
        table.seats[2].cards = ['Ad', '5d'];
        table.seats[3].cards = ['Ac', '5c'];
        table.seats[4].cards = ['4s', '4h'];
        table.seats[5].cards = ['Jd', '4c'];

        table.public.board = ['Ks', 'Qh', 'Jd', 'Tc', '9s'];
        table.pot.pots = [
            {amount: 100, contributors: [0, 1, 2, 3, 4, 5]},
            {amount: 150, contributors: [3, 4, 5]},
            {amount: 200, contributors: [4, 5]}
        ];

        const messages = table.showdown();

        // Base pot: Split between A, B, C, D. Should get 100
        // Side pot-1: winner = D. Should get 150
        // Side pot-2: Split between D, E: should get 200
        expect   (messages.length).toEqual(3);
        expect(messages[0])
            .toMatch("A, B, C, D split the pot (100)");
        expect(messages[1])
            .toMatch("D wins the pot (150)");
        expect(messages[2])
            .toMatch("E, F split the pot (200)");
    });
});
