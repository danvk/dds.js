/**
 * Load a .pbn file and split it into separate pages for each player.
 */
import * as _ from 'underscore';
import * as fs from 'fs';

var SUITS = ['S', 'H', 'D', 'C'];
const PLAYERS = ['N', 'S', 'E', 'W'];

var NEXT_PLAYER = {
  'N': 'E',
  'E': 'S',
  'S': 'W',
  'W': 'N'
};

const PLAYER_NAMES = {
  'N': 'North',
  'E': 'East',
  'S': 'South',
  'W': 'West'
};

function textToRank(txt: string): number {
  if (txt.length != 1) {
    throw 'Invalid card symbol: ' + txt;
  }
  if (txt >= '2' && txt <= '9') return Number(txt);
  if (txt == 'T') return 10;
  if (txt == 'J') return 11;
  if (txt == 'Q') return 12;
  if (txt == 'K') return 13;
  if (txt == 'A') return 14;
  throw 'Invalid card symbol: ' + txt;
}

function rankToText(rank: number): string {
  if (rank < 10) return String(rank);
  else if (rank == 10) return '10';
  else if (rank == 11) return 'J';
  else if (rank == 12) return 'Q';
  else if (rank == 13) return 'K';
  else if (rank == 14) return 'A';
  throw 'Invalid card rank: ' + rank;
}

// Given a PBN string, return a player -> string holding mapping, e.g.
// {N: 'AKQJ.984...', ...}
function parsePBNStrings(pbn: string): {[player: string]: string} {
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
  var hands: {[player: string]: string} = {};
  parts.forEach((txt, i) => {
    hands[player] = txt;
    player = NEXT_PLAYER[player];
  });
  return hands;
}

type Hand = {[suit: string]: number[]};
type Deal = {[player: string]: Hand};

function parsePBN(pbn: string): Deal {
  var textHands = parsePBNStrings(pbn);

  var deal: Deal = {};
  _.each(textHands, (txt, player) => {
    deal[player] = {};
    var suits = txt.split('.');
    if (suits.length != 4) {
      throw `${player} must have four suits, got ${suits.length}: ${txt}`;
    }
    suits.forEach((holding, idx) => {
      deal[player][SUITS[idx]] = [].map.call(holding, textToRank);
    });
  });
  return deal;
}

type PbnDeal = {
  board: string;
  pbn: string;
  dealer: string;
  vulnerability: string;
}

function highCardPoints(hand: Hand): number {
  const rankToPoints = rank => Math.max(0, rank - 10);
  let hcp = 0;
  _.each(hand, nums => {
    nums.forEach(num => { hcp += rankToPoints(num); });
  })
  return hcp;
}

function loadDeals(pbnFile: string): PbnDeal[] {
  const lines = pbnFile.split('\n');
  const deals: PbnDeal[] = [];
  for (const line of lines) {
    const m = /^\[([A-Za-z]+) \"([^"]+)\"\]$/.exec(line.trim());
    if (!m) continue;
    const [k, v] = m.slice(1);

    const deal = deals[deals.length - 1];
    if (k === 'Board') {
      deals.push({
        board: v,
        pbn: null,
        dealer: null,
        vulnerability: null
      });
    } else if (k === 'Dealer') {
      deal.dealer = v;
    } else if (k === 'Vulnerable') {
      deal.vulnerability = v;
    } else if (k === 'Deal') {
      deal.pbn = v;
    }
  }
  return deals;
}

// Note: in alternating color by suit, the way I like to order my hand.
const SUIT_SYMBOLS: {[suit: string]: string} = {
  'S': '♠',
  'H': '<span style="color:red">♥</span>',
  'C': '♣',
  'D': '<span style="color:red">♦</span>'
};

function dealsToHTML(deals: PbnDeal[]): string {
  const out: {[player: string]: string} = {
    N: '<h1>North</h1><div class="player">',
    S: '<h1>South</h1><div class="player">',
    E: '<h1>East</h1> <div class="player">',
    W: '<h1>West</h1> <div class="player">',
  };

  for (const deal of deals) {
    const hand = parsePBN(deal.pbn);
    PLAYERS.forEach(player => {
      let handHTML = '';
      _.forEach(SUIT_SYMBOLS, (sym, suit) => {
        const holding = hand[player][suit];
        const holdingHTML = holding.length > 0 ?
          holding.map(rankToText).join(' ') :
          '(void)';
        handHTML += `${sym} ${holdingHTML} `;
      });
      const hcp = highCardPoints(hand[player]);

      out[player] += `<div class="board">
        <b>Board ${deal.board}</b>
        <div class=board-inner>
          <span class=hand>${handHTML}</span>
          <span class=dealer>Dealer: ${PLAYER_NAMES[deal.dealer]}</span>
          <span class=hcp>(${hcp})</span>
          <span class=vulnerability>Vulnerable: ${deal.vulnerability}</span>
        </div>
      </div>`;
    });
  }
  _.each(out, (html, player) => {
    out[player] += '</div>';  // close class="player" div
  });

  const handsHTML = _.values(out).join('<p style="page-break-after:always;"></p>');
  return `<html>
  <head>
    <meta charset="UTF-8">
    <style>
      h1 {
        margin-bottom: 0;
      }
      .board {
        display: inline-block;
        width: 50%;
        margin-top: 1em;
        margin-bottom: 0.5em;
      }
      .board-inner {
        display: table;
      }
      .hcp {
        float: right;
        font-size: small;
      }
      .dealer, .vulnerability {
        display: block;
      }
    </style>
  </head>
  ${handsHTML}
  </html>`;
}

const [,, pbnFile] = process.argv;

const data = fs.readFileSync(pbnFile).toString();
const deals = loadDeals(data);

fs.writeFileSync('deals.html', dealsToHTML(deals));

console.log('Rendered ', deals.length, ' deals --> deals.html');
