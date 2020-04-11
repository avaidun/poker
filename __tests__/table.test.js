'use strict';

const Player = require('../poker_modules/player.js');
const Table = require('../poker_modules/table.js');
const Utils = require('./utils.test.js');


describe('Next player tests', () => {

    const t = Utils.setupDefaultTable();
    const table = t.table;

    test(`Next player - no criteria:`, async () => {
        expect(table.findNextPlayer(0)).toEqual(1);
    });

    test(`Next player - no criteria - wraparound:`, async () => {
        expect(table.findNextPlayer(5)).toEqual(0);
    });

    test(`Next player - criteria chipsInPlay>x`, async () => {
        expect(table.findNextPlayer(0, {'chipsInPlay': (x) => x > 400}))
            .toEqual(4); 
    });

    test(`Next player - criteria chipsInPlay<x`, async () => {
        expect(table.findNextPlayer(1, {'chipsInPlay': (x) => x < 400}))
            .toEqual(2); 
    });

    test(`Next player - criteria chipsInPlay>x && inHand==true`, async () => {
        expect(table.findNextPlayer(1, 
            {'chipsInPlay': (x) => x > 400,
             'inHand': (x) => x}))
            .toEqual(4);
    });

    test(`Next player - no matching criteria`, async () => {
        expect(table.findNextPlayer(1, {'chipsInPlay': (x) => x > 1000})) 
            .toEqual(null);
    });
});


describe('Prev player tests', () => {

    const t = Utils.setupDefaultTable();
    const table = t.table;

    test(`Prev player - no criteria:`, async () => {
        expect(table.findPreviousPlayer(5)).toEqual(4);
    });

    test(`Prev player - no criteria - wraparound:`, async () => {
        expect(table.findPreviousPlayer(0)).toEqual(5);
    });

    test(`Prev player - criteria chipsInPlay>x`, async () => {
        expect(table.findPreviousPlayer(1, {'chipsInPlay': (x) => x > 400}))
            .toEqual(5); 
    });

    test(`Prev player - criteria chipsInPlay<x`, async () => {
        expect(table.findPreviousPlayer(5, {'chipsInPlay': (x) => x < 400}))
            .toEqual(2); 
    });

    test(`Prev player - criteria chipsInPlay>x && inHand==true - #1`, async () => {
        expect(table.findPreviousPlayer(5, 
            {'chipsInPlay': (x) => x < 400,
             'inHand': (x) => x}))
            .toEqual(2);
    });


    test(`Prev player - criteria chipsInPlay>x && inHand==true - #2`, async () => {
        table.seats[2].public.inHand = false;
        expect(table.findPreviousPlayer(5, 
            {'chipsInPlay': (x) => x < 400,
             'inHand': (x) => x}))
            .toEqual(1);
    });


    test(`Prev player - no matching criteria`, async () => {
        expect(table.findPreviousPlayer(1, {'chipsInPlay': (x) => x > 1000})) 
            .toEqual(null);
    });
});