// 'N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4'

// to make the page load faster during development
calcDDTable.cache = {"N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4":{"N":{"N":3,"S":3,"E":9,"W":9},"S":{"N":5,"S":5,"E":8,"W":8},"H":{"N":3,"S":3,"E":9,"W":9},"D":{"N":6,"S":6,"E":7,"W":7},"C":{"N":3,"S":3,"E":9,"W":9}}};

type Play = {
  suit: string;
  rank: number;
  player: string;
};

type CompleteTrick = {
  leader: string;
  winner: ?string;
  plays: Play[];
};

class Board {
  constructor(pbn: string, strain: string) {
    this.cards = parsePBN(pbn);  // remaining cards in hands
    this.lastTrickPBN = pbn;
    this.firstPlayer = pbn[0];  // first to play comes directly from PBN.
    this.strain = strain;  // e.g. spades or no trump ('H', 'S', 'N', ...)
    this.player = this.firstPlayer;  // next to play
    this.plays = [];  // plays in this trick
    this.tricks = [];  // previous tricks. Array of CompleteTrick.
    this.ew_tricks = 0;
    this.ns_tricks = 0;
  }

  leader(): string {
    return this.plays.length ? this.plays[0].player : this.player;
  }

  isCompleted(): boolean {
    return this.ew_tricks + this.ns_tricks == 13;
  }

  // Play a card
  play(player: string, suit: string, rank: number) {
    if (player != this.player) {
      throw 'Played out of turn';
    }
    var holding = this.cards[player][suit];
    var idx = holding.indexOf(rank);
    if (idx == -1) {
      throw `${player} tried to play ${rank} ${suit} which was not in hand.`;
    }
    var legalPlays = this.legalPlays();
    if (!_.find(legalPlays, {player, suit, rank})) {
      throw `${suit} ${rank} by ${player} does not follow suit.`;
    }

    this.cards[player][suit].splice(idx, 1);
    this.plays.push({player, suit, rank});
    if (this.plays.length == 4) {
      this.sweep();
    } else {
      this.player = NEXT_PLAYER[player];
    }
  }

  // A trick has been completed. Determine the winner and advance the state.
  sweep() {
    if (this.plays.length != 4) {
      throw 'Tried to sweep incomplete trick';
    }
    var topSuit = this.plays[0].suit,
        topRank = this.plays[0].rank,
        winner = this.plays[0].player;
    for (var i = 1; i < 4; i++) {
      var {suit, rank, player} = this.plays[i];
      if ((suit == topSuit && rank > topRank) ||
          (suit == this.strain && topSuit != this.strain)) {
        topSuit = suit;
        topRank = rank;
        winner = player;
      }
    }

    var trick = {
      plays: this.plays,
      leader: this.plays[0].player,
      winner
    };
    this.tricks.push(trick);
    this.plays = [];
    this.player = winner;
    if (winner == 'N' || winner == 'S') {
      this.ns_tricks++;
    } else {
      this.ew_tricks++;
    }
    this.lastTrickPBN = this.toPBN();
  }

  // Returns an array of {player, suit, rank} objects.
  // TODO: replace this with a call to nextPlays()
  legalPlays() {
    var player = this.player;
    var followSuit = this.plays.length ? this.plays[0].suit : null;
    if (followSuit && this.cards[player][followSuit].length == 0) {
      followSuit = null;
    }

    var cards = this.cardsForPlayer(player);
    if (followSuit) {
      cards = cards.filter(({suit}) => suit == followSuit);
    }
    return cards.map(({suit, rank}) => ({player, suit, rank}));
  }

  // Interface to dds.js
  nextPlays() {
    return nextPlays(this.lastTrickPBN,
                     this.strain,
                     this.plays.map(formatCard));
  }

  // Returns an array of {suit, rank} objects.
  cardsForPlayer(player: string) {
    var cards = this.cards[player];
    return _.flatten(_.map(cards, (ranks, suit) => ranks.map(rank => ({suit, rank}))));
  }

  getDeclarer(): string {
    return NEXT_PLAYER[NEXT_PLAYER[NEXT_PLAYER[this.firstPlayer]]];
  }

  // Undo the last play
  undo() {
    var prevTricks = this.tricks.length,
        plays = this.plays.length;

    if (plays == 0) {
      if (prevTricks == 0) {
        throw 'Cannot undo play when no plays have occurred.';
      } else {
        prevTricks -= 1;
        plays = 3;
      }
    } else {
      plays--;
    }
    this.undoToPlay(prevTricks, plays);
  }

  // Undo to a previous position.
  // trickNum \in 0..12
  // playNum \in 0..3
  undoToPlay(trickNum: number, playNum: number) {
    // gather all the cards that have been played
    var cards = _.flatten(this.tricks.map(trick => trick.plays));
    cards = cards.concat(this.plays);

    // restore cards to hands
    for (var {player, suit, rank} of cards) {
      this.cards[player][suit].push(rank);
    }
    this.sortHands();

    // reset tricks & player
    this.player = this.firstPlayer;
    this.tricks = [];
    this.plays = [];
    this.ew_tricks = 0;
    this.ns_tricks = 0;
    this.lastTrickPBN = this.toPBN();

    // replay until the appropriate point
    for (var {player, suit, rank} of cards) {
      if (this.tricks.length == trickNum && this.plays.length == playNum) {
        break;
      }
      this.play(player, suit, rank);
    }
  }

  indexForCard(suit: string, rank: string): [numer, number] {
    for (var i = 0; i < this.tricks.length; i++) {
      var plays = this.tricks[i].plays;
      for (var j = 0; j < plays.length; j++) {
        var card = plays[j];
        if (card.suit == suit && card.rank == rank) {
          return [i, j];
        }
      }
    }

    for (var j = 0; j < this.plays.length; j++) {
      var card = this.plays[j];
      if (card.suit == suit && card.rank == rank) {
        return [i, j];
      }
    }

    throw `Couldn't find played card ${rank} ${suit}`;
  }

  undoToCard(suit: string, rank: number) {
    var [trickNum, playNum] = this.indexForCard(suit, rank);
    this.undoToPlay(trickNum, playNum);
  }

  // Sort all holdings from highest to lowest rank
  sortHands() {
    for (var player in this.cards) {
      for (var suit in this.cards[player]) {
        this.cards[player][suit].sort((a, b) => b - a);
      }
    }
  }

  toPBN() {
    var player = this.player;
    var holdings = [];
    for (var i = 0; i < 4; i++) {
      var hand = this.cards[player];
      holdings.push(['S', 'H', 'D', 'C'].map(suit => hand[suit].map(rankToText).join('')).join('.'));
      player = NEXT_PLAYER[player];
    }
    return this.player + ':' + holdings.join(' ');
  }
}

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
  else if (rank == 10) return 'T';
  else if (rank == 11) return 'J';
  else if (rank == 12) return 'Q';
  else if (rank == 13) return 'K';
  else if (rank == 14) return 'A';
  throw 'Invalid card rank: ' + rank;
}

// Returns a 2-character string like "QD" or "TH"
function formatCard(card: {suit: string, rank: number}): string {
  return rankToText(card.rank) + card.suit;
}

function onSameTeam(a: string, b: string): boolean {
  return a == b || NEXT_PLAYER[NEXT_PLAYER[a]] == b;
}

var SUITS = ['S', 'H', 'D', 'C'];

var NEXT_PLAYER = {
  'N': 'E',
  'E': 'S',
  'S': 'W',
  'W': 'N'
};
var PLAYER_TO_ARROW = {
  'N': '⬆',
  'W': '⬅',
  'S': '⬇',
  'E': '➡'
};

// Given a PBN string, return a player -> string holding mapping, e.g.
// {N: 'AKQJ.984...', ...}
function parsePBNStrings(pbn: string): {[key: string]: string} {
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
  parts.forEach((txt, i) => {
    hands[player] = txt;
    player = NEXT_PLAYER[player];
  });
  return hands;
}

function parsePBN(pbn: string) {
  var textHands = parsePBNStrings(pbn);

  var deal = {};
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

// Rotate the PBN string so that firstPlayer is first.
function rotatePBN(pbn, firstPlayer) {
  if (firstPlayer.length != 1 || 'NSEW'.indexOf(firstPlayer) == -1) {
    throw `Invalid player: ${firstPlayer}`;
  }
  var textHands = parsePBNStrings(pbn);
  var player = firstPlayer;
  var hands = [];
  do {
    hands.push(textHands[player]);
    player = NEXT_PLAYER[player];
  } while (player != firstPlayer);
  return firstPlayer + ':' + hands.join(' ');
}

var SUIT_SYMBOLS = {
  'S': '♠',
  'H': '♥',
  'D': '♦',
  'C': '♣'
};


const SUIT_RANKS = {'S': 0, 'H': 1, 'D': 2, 'C': 3};

// Comparator for card ranks.
function compareCards(a: {suit: string, rank: number},
                      b: {suit: string, rank: number}): number {
  if (a.suit != b.suit) {
    return SUIT_RANKS[a.suit] - SUIT_RANKS[b.suit];
  } else {
    return a.rank - b.rank;
  }
}

/**
 * Play out all remaining tricks on a board using min/max.
 * This is done asynchronously. Calls the callback after each play.
 * Returns a Promise which is resolved after the last play is completed.
 */
function autoPlay(b: Board, cb: ()=>void): Promise {
  return new Promise((resolve, reject) => {
    let declarer = b.getDeclarer();
    var iterate = () => {
      if (b.isCompleted()) {
        resolve();
        return;
      }

      let plays = b.nextPlays().plays.map(x => _.extend({}, x, {rank: textToRank(x.rank)}));
      plays.sort((a, b) => -compareCards(a, b));
      plays = _.sortBy(plays, p => -p.score);
      let p = plays[0];
      b.play(b.player, p.suit, p.rank);
      cb();
      window.requestAnimationFrame(iterate);
    };
    window.requestAnimationFrame(iterate);
  });
}

/**
 * props:
 *   suit: {'S', 'H', 'D', 'C'}
 *   rank: {'1'..'9', 'T', 'J', 'Q', 'K', 'A'}
 *   making: null | number
 *   facedown: {false, true}
 *   onClick: (suit: string, rank: number) => void
 */
class Card extends React.Component {
  handleClick() {
    if (this.props.onClick) {
      this.props.onClick(this.props.suit, this.props.rank);
    }
  }

  render() {
    var suit = this.props.suit;
    var suitSym = SUIT_SYMBOLS[suit];
    var rankSym = this.props.rank;
    if (rankSym == 'T') rankSym = '10';
    if (rankSym == 11) rankSym = 'J';
    if (rankSym == 12) rankSym = 'Q';
    if (rankSym == 13) rankSym = 'K';
    if (rankSym == 14) rankSym = 'A';
    var className = 'card' + (this.props.className ? ' ' + this.props.className : '');
    if (this.props.facedown) {
      return (
          <div className={className + ' facedown'}>
            <span className='rank'>{'\u00a0'}</span>
            <span className='suit'>{'\u00a0'}</span>
          </div>
        );
    } else {
      return (
          <div className={className} onClick={this.handleClick.bind(this)}>
            <span className='rank'>{rankSym}</span>
            <span className={'suit suit-' + suit}>{suitSym}</span>
            <span className='making'>{this.props.making}</span>
          </div>
      );
    }
  }
}

/**
 * props:
 *   hand: { 'S': [4, 9, 13], ... }
 *   enable: 'all' | 'S' | 'H' | 'C' | 'D' | 'none'
 *   oneRow: boolean
 *   making: [{rank, suit, score}]
 *   onClick: (suit: string, rank: number) => void
 */
class Hand extends React.Component {
  handleClick(suit: string, rank: number) {
    var enable = this.props.enable || 'all';
    if (this.props.onClick && (enable == 'all' || enable == suit)) {
      this.props.onClick(suit, rank);
    }
  }

  render() {
    var click = this.handleClick.bind(this);
    var making = _.mapObject(_.groupBy(this.props.making, 'suit'),
                             vs => _.object(vs.map(({rank, score}) => [rank, score])));
    var cards = {};
    for (var suit in this.props.hand) {
      var holding = this.props.hand[suit];
      var mkSuit = making[suit] || {};
      cards[suit] = holding.map(rank => <Card key={rank}
                                              suit={suit}
                                              rank={rank}
                                              making={mkSuit[rank]}
                                              onClick={click} />);
    }
    var sep = this.props.oneRow ? ' ' : <br/>;
    var enable = this.props.enable || 'all';
    var d = enable == 'all' ? true : false;
    var enabled = {'S': d, 'H': d, 'C': d, 'D': d};
    if (enable in enabled) {
      enabled[enable] = true;
    }
    var suitClass = {};
    for (var k in enabled) {
      suitClass[k] = 'suit ' + (enabled[k] ? 'enable' : 'disabled');
    }
    return (
      <div className="hand">
        <div className={suitClass['S']}>{cards['S']}</div>
        {sep}
        <div className={suitClass['H']}>{cards['H']}</div>
        {sep}
        <div className={suitClass['C']}>{cards['C']}</div>
        {sep}
        <div className={suitClass['D']}>{cards['D']}</div>
      </div>
    );
  }
}

/**
 * props:
 *   plays: [{suit: 'S', rank: 14}, ...]
 *   lead: 'W' | ...
 *   winner: null | 'W' | ...
 *   showArrow: true | false
 *   isPositiveTrick: true | false | undefined
 *   onClick: (suit: string, rank: number) => void
 */
class Trick extends React.Component {
  handleClick(player, suit: string, rank: number) {
    if (this.props.onClick) {
      this.props.onClick(player, suit, rank);
    }
  }
  
  render() {
    // Matches size of a card
    var spacer = <div style={{width: '22px', height: '38px'}}></div>;
    var playerToCard = {N: spacer, S: spacer, E: spacer, W: spacer};
    var player = this.props.leader;
    var makeClick = player => this.handleClick.bind(this, player);
    for (var card of this.props.plays) {
      var className = player == this.props.leader ? 'lead' : null;
      playerToCard[player] = <Card rank={card.rank}
                                   suit={card.suit}
                                   className={className}
                                   onClick={makeClick(player)} />;
      player = NEXT_PLAYER[player];
    }
    var arrow = this.props.showArrow ? PLAYER_TO_ARROW[player] : ' ';
    var isPositiveTrick = this.props.isPositiveTrick,
        backgroundClass = isPositiveTrick === true ? 'positive' : isPositiveTrick === false ? 'negative' : '';

    return (
      <table className={'trick ' + backgroundClass}>
        <tbody>
          <tr>
            <td colSpan={3} className="north-trick">
              {playerToCard['N']}
            </td>
          </tr>
          <tr>
            <td className="west-trick">
              {playerToCard['W']}
            </td>
            <td>{arrow}</td>
            <td className="east-trick">
              {playerToCard['E']}
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="south-trick">
              {playerToCard['S']}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

/**
 * props:
 *   deal: (parsed PBN)
 *   plays: [{suit: 'S', rank: 14}, ...]
 *   leader: 'W'
 *   legalSuit: 'all' | 'S' | 'H' | 'C' | 'D'
 *   making: {player: [{rank, suit, score}]}
 *   onClick: (player: string, suit: string, rank: number) => void
 *   onUndo: (player: string, suit: string, rank: number) => void
 *
 * TODO: kill legalSuit and use only `making`
 */
class Deal extends React.Component {
  handleClick(player: string, suit: string, rank: number) {
    if (this.props.onClick) {
      this.props.onClick(player, suit, rank);
    }
  }

  handleUndo(player: string, suit: string, rank: number) {
    if (this.props.onUndo) {
      this.props.onUndo(player, suit, rank);
    }
  }

  getEnables() {
    var enables = {'N': 'none', 'E': 'none', 'S': 'none', 'W': 'none'};
    var player = this.props.leader;
    for (var i = 0; i < this.props.plays.length; i++) {
      player = NEXT_PLAYER[player];
    }
    enables[player] = this.props.legalSuit;
    return enables;
  }

  render() {
    var d = this.props.deal;
    var makeClick = player => this.handleClick.bind(this, player);
    var enables = this.getEnables();
    var making = this.props.making;
    return (
      <table className="deal">
        <tbody>
          <tr>
            <td colSpan={3} className="north" style={{'textAlign': 'center'}}>
              <Hand oneRow={true} hand={d.N} enable={enables.N} making={making.N} onClick={makeClick('N')} />
              <div className="player-label">
                North
              </div>
            </td>
          </tr>
          <tr>
            <td className="west">
              <div>
                <Hand hand={d.W} enable={enables.W} making={making.W} onClick={makeClick('W')} />
              </div>
              <div className="player-label">
              W<br/>
              e<br/>
              s<br/>
              t
              </div>
            </td>
            <td className="plays">
              <Trick showArrow={true} plays={this.props.plays} leader={this.props.leader} onClick={this.handleUndo.bind(this)} />
            </td>
            <td className="east">
              <div className="player-label">
              E<br/>
              a<br/>
              s<br/>
              t
              </div>
              <div>
                <Hand hand={d.E} enable={enables.E} making={making.E} onClick={makeClick('E')} />
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="south" style={{'textAlign': 'center'}}>
              <div className="player-label">
                South
              </div>
              <Hand oneRow={true} hand={d.S} enable={enables.S} making={making.S} onClick={makeClick('S')} />
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

/**
 * props:
 *   matrix: Output of calcDDTable()
 *   strain: currently selected strain
 *   declarer: currently selected declarer
 *   onClick: (strain: string, declarer: string) => void
 */
class DDMatrix extends React.Component {
  handleClick(strain: string, player: string) {
    if (this.props.onClick) {
      this.props.onClick(strain, player);
    }
  }

  render() {
    var m = this.props.matrix;
    var ud = num => (num >= 7 ? 'up' : 'down');
    var makeCell = (strain, player) => {
      var tricks = m[strain][player];
      var selected = strain == this.props.strain && player == this.props.declarer;
      var className = [ud(tricks)].concat(selected ? ['selected'] : []).join(' ');
      var clickFn = this.handleClick.bind(this, strain, player);
      return (
        <td key={strain+player} className={className} onClick={clickFn}>
          {tricks}
        </td>
      );
    };

    var rows = ['N', 'S', 'E', 'W'].map(player => (
          <tr key={player}>
            <td>{player}</td>
            {makeCell('N', player)}
            {makeCell('S', player)}
            {makeCell('H', player)}
            {makeCell('D', player)}
            {makeCell('C', player)}
          </tr>));

    return (
      <table className="dd-matrix">
        <tbody>
          <tr>
            <th>{' '}</th>
            <th className="suit suit-N">NT</th>
            <th className="suit suit-S">♠</th>
            <th className="suit suit-H">♥</th>
            <th className="suit suit-D">♦</th>
            <th className="suit suit-C">♣</th>
          </tr>
          {rows}
        </tbody>
      </table>
    );
  }
}

/**
 * props:
 * - board
 * - onChange
 */
class Explorer extends React.Component {
  constructor(props) {
    super(props);
  }

  handleClick(player: string, suit: string, rank: number) {
    var board = this.props.board;
    board.play(player, suit, rank);
    this.forceUpdate();
    if (this.props.onChange) this.props.onChange();
  }

  handleUndo(player: string, suit: string, rank: number) {
    this.props.board.undoToCard(suit, rank);
    this.forceUpdate();
    if (this.props.onChange) this.props.onChange();
  }

  // Returns a {player -> [{suit, rank, score}, ...]} object.
  // score is tricks available to the declarer after each play.
  getMaking(board: Board) {
    var data = board.nextPlays();
    var player = data.player;
    var makingPlays = _.flatten((data.plays || []).map(({suit, rank, score, equals}) => {
      return [{suit, rank, score}].concat(equals.map(rank => ({suit, rank, score})));
    })).map(({suit, rank, score}) => ({suit, rank: textToRank(rank), score}));
    makingPlays.forEach(play => {
      if (onSameTeam(player, board.getDeclarer())) {
        play.score += (player == 'E' || player == 'W') ? board.ew_tricks : board.ns_tricks;
      } else {
        play.score += (player == 'E' || player == 'W') ? board.ew_tricks : board.ns_tricks;
        play.score = 13 - play.score;
      }
    });

    return {
      [player]: makingPlays
    };
  }

  render() {
    var board = this.props.board;
    var handleUndo = this.handleUndo.bind(this);
    var prevTricks = board.tricks.map(
        (trick, i) => <Trick key={i}
                             plays={trick.plays}
                             leader={trick.leader}
                             winner={trick.winner}
                             isPositiveTrick={onSameTeam(trick.winner, board.getDeclarer())}
                             onClick={handleUndo} />);
    var legalPlays = board.legalPlays();
    var legalSuits = _.uniq(_.pluck(legalPlays, 'suit'));
    var legalSuit = legalSuits.length == 1 ? legalSuits[0] : 'all';

    var making = this.getMaking(board);
    var deal = board.isCompleted() ? null : 
        <Deal deal={board.cards}
              plays={board.plays}
              leader={board.leader()}
              legalSuit={legalSuit}
              making={making}
              onClick={this.handleClick.bind(this)}
              onUndo={handleUndo} />;

    return (
      <div>
        {deal}
        <div className="score">
          <p>{board.ns_tricks} North-South</p>
          <p>{board.ew_tricks} East-West</p>
        </div>
        <div className="previous-tricks">
          {prevTricks}
        </div>
      </div>
    );
  }
}

// Given a file object from a FileList, return a Promise for an
// HTMLImageElement.
function loadUploadedImage(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onloadend = function () {
      var image = new Image();
      image.onload = function () {
        var width = image.width,
            height = image.height;
        console.log('Image dimensions: ', width, 'x', height);
        resolve(image);
      };

      image.onerror = function () {
        console.error('There was an error processing your file!');
        reject('There was an error processing your file!');
      };
      
      image.src = reader.result;
    };
    reader.onerror = function () {
      console.error('There was an error reading the file!');
      reject('There was an error reading the file!');
    };

    reader.readAsDataURL(file);
  });
}

/**
 * props:
 *   initialPBN
 *   initialDeclarer
 *   initialStrain
 *   initialPlays
 */
class Root extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pbn: props.initialPBN,
      strain: props.initialStrain,
      declarer: props.initialDeclarer
    };
    this.board = this.makeBoard(this.state);
    for (let play of props.initialPlays) {
      this.board.play(this.board.player, play.suit, play.rank);
    }
  }

  // Update in response to form changes.
  handleFormSubmit(e: SyntheticEvent) {
    e.preventDefault();
    this.setState({
      pbn: this.refs.pbn.value
    });
  }

  handleUpload(e: SyntheticEvent) {
    var file = e.target.files[0];
    Promise.all([
      ibb.loadReferenceData('ibb/ns-black.png', 'ibb/ns-red.png'),
      loadUploadedImage(file)])
    .then(([ref, img]) => {
      var hand = ibb.recognizeHand(img, ref);
      if (hand.errors.length) {
        console.warn('Unable to recognize iBridgeBaron hand', hand.errors);
        return;
      }

      this.setState({pbn: hand.pbn});
    }).catch(error => {
      alert(error);
    });
  }

  handleDDClick(strain: string, declarer: string) {
    this.setState({ strain, declarer });
  }

  makeBoard(state) {
    var pbn = rotatePBN(state.pbn, NEXT_PLAYER[state.declarer]);
    return new Board(pbn, state.strain);
  }

  componentDidMount() {
    this.updateUI();
  }

  componentWillUpdate(nextProps, nextState) {
    if (!_.isEqual(this.state, nextState)) {
      this.board = this.makeBoard(nextState);
    }
  }

  componentDidUpdate() {
    this.updateUI();
  }

  updateUI() {
    this.refs.pbn.value = this.state.pbn;
    this.setURL();
  }

  setURL() {
    let board = this.board;
    let plays = _.flatten(board.tricks.map(t => t.plays).concat(board.plays));
    let params = {
      strain: this.state.strain,
      declarer: this.state.declarer,
      plays: plays.map(({suit,rank}) => rankToText(rank) + suit).join(','),
      deal: this.state.pbn
    };
    let queryString = _.map(params, (v, k) => k + '=' + v).join('&');
    history.replaceState({}, '', '?' + queryString.replace(/ /g, '+'));
  }

  boardDidUpdate() {
    this.setURL();
  }

  autoPlay() {
    autoPlay(this.board, () => {
      this.forceUpdate();
    }).then(() => {
    });
  }

  render() {
    var handleFormSubmit = this.handleFormSubmit.bind(this),
        handleUpload = this.handleUpload.bind(this);
    return (
      <div>
        <form onSubmit={handleFormSubmit}>
          PBN: <input type="text" size="70" ref="pbn" />
        </form>
        <form onChange={handleUpload}>
          iBridgeBaron: <input ref="ibb" type="file" accept="image/*" />
        </form>
        <button onClick={this.autoPlay.bind(this)}>Autoplay</button>
        <DDMatrix matrix={calcDDTable(this.state.pbn)}
                  declarer={this.state.declarer} 
                  strain={this.state.strain}
                  onClick={this.handleDDClick.bind(this)} />
        <Explorer board={this.board}
                  onChange={this.boardDidUpdate.bind(this)} />
      </div>
    );
  }
}

// Via http://stackoverflow.com/a/2880929/388951
function parseQueryString() {
  var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

  var urlParams = {};
  while (match = search.exec(query)) {
   urlParams[decode(match[1])] = decode(match[2]);
  }
  return urlParams;
}

function parsePlays(playsStr: string) {
  if (!playsStr) return [];
  return playsStr.split(',')
                 .map(play => ({
                   rank: textToRank(play[0]),
                   suit: play[1]
                 }));
}

window.parsePBN = parsePBN;
window.rotatePBN = rotatePBN;
window.Board = Board;
window.Root = Root;

var root = document.getElementById('root');
if (root) {
  var params = parseQueryString();
  var pbn = params.deal ? params.deal.replace(/\+/g, ' ') : 'N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4';
  var strain = params.strain || 'N';
  var declarer = params.declarer || 'W';
  var plays = parsePlays(params.plays) || [];

  ReactDOM.render(
    <Root initialPBN={pbn}
          initialStrain={strain}
          initialDeclarer={declarer}
          initialPlays={plays} />,
    root
  );
}
