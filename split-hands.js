"use strict";
/**
 * Load a .pbn file and split it into separate pages for each player.
 */
var _ = require('underscore');
var fs = require('fs');
var SUITS = ['S', 'H', 'D', 'C'];
var PLAYERS = ['N', 'S', 'E', 'W'];
var NEXT_PLAYER = {
    'N': 'E',
    'E': 'S',
    'S': 'W',
    'W': 'N'
};
var PLAYER_NAMES = {
    'N': 'North',
    'E': 'East',
    'S': 'South',
    'W': 'West'
};
function textToRank(txt) {
    if (txt.length != 1) {
        throw 'Invalid card symbol: ' + txt;
    }
    if (txt >= '2' && txt <= '9')
        return Number(txt);
    if (txt == 'T')
        return 10;
    if (txt == 'J')
        return 11;
    if (txt == 'Q')
        return 12;
    if (txt == 'K')
        return 13;
    if (txt == 'A')
        return 14;
    throw 'Invalid card symbol: ' + txt;
}
function rankToText(rank) {
    if (rank < 10)
        return String(rank);
    else if (rank == 10)
        return '10';
    else if (rank == 11)
        return 'J';
    else if (rank == 12)
        return 'Q';
    else if (rank == 13)
        return 'K';
    else if (rank == 14)
        return 'A';
    throw 'Invalid card rank: ' + rank;
}
// Given a PBN string, return a player -> string holding mapping, e.g.
// {N: 'AKQJ.984...', ...}
function parsePBNStrings(pbn) {
    var parts = pbn.split(' ');
    if (parts.length != 4) {
        throw 'PBN must have four hands (got ' + parts.length + ')';
    }
    var m = parts[0].match(/^([NSEW]):/);
    if (!m) {
        throw 'PBN must start with either "N:", "S:", "E:" or "W:"';
    }
    parts[0] = parts[0].slice(2);
    var player = m[1];
    var hands = {};
    parts.forEach(function (txt, i) {
        hands[player] = txt;
        player = NEXT_PLAYER[player];
    });
    return hands;
}
function parsePBN(pbn) {
    var textHands = parsePBNStrings(pbn);
    var deal = {};
    _.each(textHands, function (txt, player) {
        deal[player] = {};
        var suits = txt.split('.');
        if (suits.length != 4) {
            throw player + " must have four suits, got " + suits.length + ": " + txt;
        }
        suits.forEach(function (holding, idx) {
            deal[player][SUITS[idx]] = [].map.call(holding, textToRank);
        });
    });
    return deal;
}
function loadDeals(pbnFile) {
    var lines = pbnFile.split('\n');
    var deals = [];
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        var m = /^\[([A-Za-z]+) \"([^"]+)\"\]$/.exec(line.trim());
        if (!m)
            continue;
        var _a = m.slice(1), k = _a[0], v = _a[1];
        var deal = deals[deals.length - 1];
        if (k === 'Board') {
            deals.push({
                board: v,
                pbn: null,
                dealer: null,
                vulnerability: null
            });
        }
        else if (k === 'Dealer') {
            deal.dealer = v;
        }
        else if (k === 'Vulnerable') {
            deal.vulnerability = v;
        }
        else if (k === 'Deal') {
            deal.pbn = v;
        }
    }
    return deals;
}
var SUIT_SYMBOLS = {
    'S': '♠',
    'H': '<span style="color:red">♥</span>',
    'D': '<span style="color:red">♦</span>',
    'C': '♣'
};
function dealsToHTML(deals) {
    var out = {
        N: '<h1>North</h1><div class="player">',
        S: '<h1>South</h1><div class="player">',
        E: '<h1>East</h1> <div class="player">',
        W: '<h1>West</h1> <div class="player">'
    };
    var _loop_1 = function(deal) {
        var hand = parsePBN(deal.pbn);
        PLAYERS.forEach(function (player) {
            var handHTML = "<p class=\"board\"><b>Board " + deal.board + "</b><br>\n";
            _.forEach(SUIT_SYMBOLS, function (sym, suit) {
                var holding = hand[player][suit];
                var holdingHTML = holding.length > 0 ?
                    holding.map(rankToText).join(' ') :
                    '(void)';
                handHTML += sym + " " + holdingHTML + " ";
            });
            handHTML += "\n<br>Dealer: " + PLAYER_NAMES[deal.dealer];
            handHTML += "\n<br>Vulnerable: " + deal.vulnerability;
            handHTML += '\n</p>\n';
            out[player] += handHTML;
        });
    };
    for (var _i = 0, deals_1 = deals; _i < deals_1.length; _i++) {
        var deal = deals_1[_i];
        _loop_1(deal);
    }
    _.each(out, function (html) { html += '</div>'; });
    var handsHTML = _.values(out).join('<p style="page-break-after:always;"></p>');
    return "<html>\n  <head>\n    <meta charset=\"UTF-8\">\n    <style>\n      h1 {\n        margin-bottom: 0;\n      }\n      .board {\n        display: inline-block;\n        width: 45%;\n        margin-bottom: 0.5em;\n      }\n    </style>\n  </head>\n  " + handsHTML + "\n  </html>";
}
var data = fs.readFileSync('HandRecord-12.pbn');
var deals = loadDeals(data.toString());
console.log('Loaded ', deals.length, ' deals.');
fs.writeFileSync('deals.html', dealsToHTML(deals));
