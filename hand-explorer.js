/// <reference path="typings/react/react-global.d.ts" />
/// <reference path="typings/underscore/underscore.d.ts" />
// 'N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4'
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Board = (function () {
    function Board(pbn, declarer, strain) {
        this.cards = parsePBN(pbn); // remaining cards in hands
        this.lastTrickPBN = pbn;
        this.declarer = declarer;
        this.strain = strain; // e.g. spades or no trump ('H', 'S', 'N', ...)
        this.player = NEXT_PLAYER[declarer]; // next to play
        this.plays = []; // plays in this trick
        this.tricks = []; // previous tricks. Array of CompleteTrick.
        this.ew_tricks = 0;
        this.ns_tricks = 0;
    }
    Board.prototype.leader = function () {
        return this.plays.length ? this.plays[0].player : this.player;
    };
    // Play a card
    Board.prototype.play = function (player, suit, rank) {
        if (player != this.player) {
            throw 'Played out of turn';
        }
        var holding = this.cards[player][suit];
        var idx = holding.indexOf(rank);
        if (idx == -1) {
            throw player + " tried to play " + rank + " " + suit + " which was not in hand.";
        }
        var legalPlays = this.legalPlays();
        if (!_.find(legalPlays, _.matches({ suit: suit, rank: rank, player: player }))) {
            throw suit + " " + rank + " by " + player + " does not follow suit.";
        }
        this.cards[player][suit].splice(idx, 1);
        this.plays.push({ player: player, suit: suit, rank: rank });
        if (this.plays.length == 4) {
            this.sweep();
        }
        else {
            this.player = NEXT_PLAYER[player];
        }
    };
    // A trick has been completed. Determine the winner and advance the state.
    Board.prototype.sweep = function () {
        if (this.plays.length != 4) {
            throw 'Tried to sweep incomplete trick';
        }
        var topSuit = this.plays[0].suit, topRank = this.plays[0].rank, winner = this.plays[0].player;
        for (var i = 1; i < 4; i++) {
            var _a = this.plays[i], suit = _a.suit, rank = _a.rank, player = _a.player;
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
            winner: winner
        };
        this.tricks.push(trick);
        this.plays = [];
        this.player = winner;
        if (winner == 'N' || winner == 'S') {
            this.ns_tricks++;
        }
        else {
            this.ew_tricks++;
        }
        this.lastTrickPBN = this.toPBN();
    };
    // Returns an array of {player, suit, rank} objects.
    // TODO: replace this with a call to nextPlays()
    Board.prototype.legalPlays = function () {
        var player = this.player;
        var followSuit = this.plays.length ? this.plays[0].suit : null;
        if (followSuit && this.cards[player][followSuit].length == 0) {
            followSuit = null;
        }
        var cards = this.cardsForPlayer(player);
        if (followSuit) {
            cards = cards.filter(function (_a) {
                var suit = _a.suit;
                return suit == followSuit;
            });
        }
        return cards.map(function (_a) {
            var suit = _a.suit, rank = _a.rank;
            return ({ player: player, suit: suit, rank: rank });
        });
    };
    // Interface to dds.js
    Board.prototype.nextPlays = function () {
        return nextPlays(this.lastTrickPBN, this.strain, this.plays.map(formatCard));
    };
    // Returns an array of {suit, rank} objects.
    Board.prototype.cardsForPlayer = function (player) {
        var cards = this.cards[player];
        return _.flatten(_.map(cards, function (ranks, suit) { return ranks.map(function (rank) { return ({ suit: suit, rank: rank }); }); }));
    };
    // Undo the last play
    Board.prototype.undo = function () {
        var prevTricks = this.tricks.length, plays = this.plays.length;
        if (plays == 0) {
            if (prevTricks == 0) {
                throw 'Cannot undo play when no plays have occurred.';
            }
            else {
                prevTricks -= 1;
                plays = 3;
            }
        }
        else {
            plays--;
        }
        this.undoToPlay(prevTricks, plays);
    };
    // Undo to a previous position.
    // trickNum \in 0..12
    // playNum \in 0..3
    Board.prototype.undoToPlay = function (trickNum, playNum) {
        // gather all the cards that have been played
        var cards = _.flatten(this.tricks.map(function (trick) { return trick.plays; }));
        cards = cards.concat(this.plays);
        // restore cards to hands
        for (var _i = 0; _i < cards.length; _i++) {
            var _a = cards[_i], player = _a.player, suit = _a.suit, rank = _a.rank;
            this.cards[player][suit].push(rank);
        }
        this.sortHands();
        // reset tricks & player
        this.player = NEXT_PLAYER[this.declarer];
        this.tricks = [];
        this.plays = [];
        this.ew_tricks = 0;
        this.ns_tricks = 0;
        this.lastTrickPBN = this.toPBN();
        // replay until the appropriate point
        for (var _b = 0; _b < cards.length; _b++) {
            var _c = cards[_b], player = _c.player, suit = _c.suit, rank = _c.rank;
            if (this.tricks.length == trickNum && this.plays.length == playNum) {
                break;
            }
            this.play(player, suit, rank);
        }
    };
    Board.prototype.indexForCard = function (suit, rank) {
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
        throw "Couldn't find played card " + rank + " " + suit;
    };
    Board.prototype.undoToCard = function (suit, rank) {
        var _a = this.indexForCard(suit, rank), trickNum = _a[0], playNum = _a[1];
        this.undoToPlay(trickNum, playNum);
    };
    // Sort all holdings from highest to lowest rank
    Board.prototype.sortHands = function () {
        for (var player in this.cards) {
            for (var suit in this.cards[player]) {
                this.cards[player][suit].sort(function (a, b) { return b - a; });
            }
        }
    };
    Board.prototype.toPBN = function () {
        var player = this.player;
        var holdings = [];
        for (var i = 0; i < 4; i++) {
            var hand = this.cards[player];
            holdings.push(['S', 'H', 'D', 'C'].map(function (suit) { return hand[suit].map(rankToText).join(''); }).join('.'));
            player = NEXT_PLAYER[player];
        }
        return this.player + ':' + holdings.join(' ');
    };
    return Board;
})();
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
        return 'T';
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
// Returns a 2-character string like "QD" or "TH"
function formatCard(card) {
    return rankToText(card.rank) + card.suit;
}
function onSameTeam(a, b) {
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
function parsePBN(pbn) {
    var parts = pbn.split(' ');
    if (parts.length != 4) {
        throw 'PBN must have four hands (got ' + parts.length + ')';
    }
    var m = parts[0].match(/^([NSEW]):/);
    if (!m) {
        throw 'PBN must start with either "N:", "S:", "E:" or "W:"';
    }
    var player = m[1];
    var deal = {};
    parts[0] = parts[0].slice(2);
    parts.forEach(function (txt, i) {
        deal[player] = {};
        var suits = txt.split('.');
        if (suits.length != 4) {
            throw player + " must have four suits, got " + suits.length + ": " + txt;
        }
        suits.forEach(function (holding, idx) {
            deal[player][SUITS[idx]] = [].map.call(holding, textToRank);
        });
        player = NEXT_PLAYER[player];
    });
    return deal;
}
var SUIT_SYMBOLS = {
    'S': '♠',
    'H': '♥',
    'D': '♦',
    'C': '♣'
};
var Card = (function (_super) {
    __extends(Card, _super);
    function Card() {
        _super.apply(this, arguments);
    }
    Card.prototype.handleClick = function () {
        if (this.props.onClick) {
            this.props.onClick(this.props.suit, rankToText(this.props.rank));
        }
    };
    Card.prototype.render = function () {
        var suit = this.props.suit;
        var suitSym = SUIT_SYMBOLS[suit];
        var rank = this.props.rank;
        var rankSym = '' + rank;
        if (rank == 11)
            rankSym = 'J';
        if (rank == 12)
            rankSym = 'Q';
        if (rank == 13)
            rankSym = 'K';
        if (rank == 14)
            rankSym = 'A';
        var className = 'card' + (this.props.className ? ' ' + this.props.className : '');
        if (this.props.facedown) {
            return (React.createElement("div", {"className": className + ' facedown'}, React.createElement("span", {"className": 'rank'}, '\u00a0'), React.createElement("span", {"className": 'suit'}, '\u00a0')));
        }
        else {
            return (React.createElement("div", {"className": className, "onClick": this.handleClick.bind(this)}, React.createElement("span", {"className": 'rank'}, rankSym), React.createElement("span", {"className": 'suit suit-' + suit}, suitSym), React.createElement("span", {"className": 'making'}, this.props.making)));
        }
    };
    return Card;
})(React.Component);
var Hand = (function (_super) {
    __extends(Hand, _super);
    function Hand() {
        _super.apply(this, arguments);
    }
    Hand.prototype.handleClick = function (suit, rank) {
        var enable = this.props.enable || 'all';
        if (this.props.onClick && (enable == 'all' || enable == suit)) {
            this.props.onClick(suit, rank);
        }
    };
    Hand.prototype.render = function () {
        var click = this.handleClick.bind(this);
        var making = _.mapObject(_.groupBy(this.props.making, 'suit'), function (vs) { return _.object(vs.map(function (_a) {
            var rank = _a.rank, score = _a.score;
            return [rank, score];
        })); });
        var cards = {};
        for (var suit in this.props.hand) {
            var holding = this.props.hand[suit];
            var mkSuit = making[suit] || {};
            cards[suit] = holding.map(function (rank) { return React.createElement(Card, {"key": rank, "suit": suit, "rank": rank, "making": mkSuit[rank], "onClick": click}); });
        }
        var sep = this.props.oneRow ? ' ' : React.createElement("br", null);
        var enable = this.props.enable || 'all';
        var d = enable == 'all' ? true : false;
        var enabled = { 'S': d, 'H': d, 'C': d, 'D': d };
        if (enable in enabled) {
            enabled[enable] = true;
        }
        var suitClass = {};
        for (var k in enabled) {
            suitClass[k] = 'suit ' + (enabled[k] ? 'enable' : 'disabled');
        }
        return (React.createElement("div", {"className": "hand"}, React.createElement("div", {"className": suitClass['S']}, cards['S']), sep, React.createElement("div", {"className": suitClass['H']}, cards['H']), sep, React.createElement("div", {"className": suitClass['C']}, cards['C']), sep, React.createElement("div", {"className": suitClass['D']}, cards['D'])));
    };
    return Hand;
})(React.Component);
var Trick = (function (_super) {
    __extends(Trick, _super);
    function Trick() {
        _super.apply(this, arguments);
    }
    Trick.prototype.handleClick = function (player, suit, rank) {
        if (this.props.onClick) {
            this.props.onClick(player, suit, rank);
        }
    };
    Trick.prototype.render = function () {
        var _this = this;
        // Matches size of a card
        var spacer = React.createElement("div", {"style": { width: '22px', height: '38px' }});
        var playerToCard = { N: spacer, S: spacer, E: spacer, W: spacer };
        var player = this.props.leader;
        var makeClick = function (player) { return _this.handleClick.bind(_this, player); };
        for (var _i = 0, _a = this.props.plays; _i < _a.length; _i++) {
            var card = _a[_i];
            var className = player == this.props.leader ? 'lead' : null;
            playerToCard[player] = React.createElement(Card, {"rank": card.rank, "suit": card.suit, "className": className, "onClick": makeClick(player)});
            player = NEXT_PLAYER[player];
        }
        var arrow = this.props.showArrow ? PLAYER_TO_ARROW[player] : ' ';
        return (React.createElement("table", {"className": "trick"}, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("td", {"colSpan": 3, "className": "north-trick"}, playerToCard['N'])), React.createElement("tr", null, React.createElement("td", {"className": "west-trick"}, playerToCard['W']), React.createElement("td", null, arrow), React.createElement("td", {"className": "east-trick"}, playerToCard['E'])), React.createElement("tr", null, React.createElement("td", {"colSpan": 3, "className": "south-trick"}, playerToCard['S'])))));
    };
    return Trick;
})(React.Component);
var Deal = (function (_super) {
    __extends(Deal, _super);
    function Deal() {
        _super.apply(this, arguments);
    }
    Deal.prototype.handleClick = function (player, suit, rank) {
        if (this.props.onClick) {
            this.props.onClick(player, suit, rank);
        }
    };
    Deal.prototype.handleUndo = function (player, suit, rank) {
        if (this.props.onUndo) {
            this.props.onUndo(player, suit, rank);
        }
    };
    Deal.prototype.getEnables = function () {
        var enables = { 'N': 'none', 'E': 'none', 'S': 'none', 'W': 'none' };
        var player = this.props.leader;
        for (var i = 0; i < this.props.plays.length; i++) {
            player = NEXT_PLAYER[player];
        }
        enables[player] = this.props.legalSuit;
        return enables;
    };
    Deal.prototype.render = function () {
        var _this = this;
        var d = this.props.deal;
        var makeClick = function (player) { return _this.handleClick.bind(_this, player); };
        var enables = this.getEnables();
        var making = this.props.making;
        return (React.createElement("table", {"className": "deal"}, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("td", {"colSpan": 3, "className": "north", "style": { 'textAlign': 'center' }}, React.createElement(Hand, {"oneRow": true, "hand": d.N, "enable": enables.N, "making": making.N, "onClick": makeClick('N')}), React.createElement("div", {"className": "player-label"}, "North"))), React.createElement("tr", null, React.createElement("td", {"className": "west"}, React.createElement("div", null, React.createElement(Hand, {"hand": d.W, "enable": enables.W, "making": making.W, "onClick": makeClick('W')})), React.createElement("div", {"className": "player-label"}, "W", React.createElement("br", null), "e", React.createElement("br", null), "s", React.createElement("br", null), "t")), React.createElement("td", {"className": "plays"}, React.createElement(Trick, {"showArrow": true, "plays": this.props.plays, "leader": this.props.leader, "onClick": this.handleUndo.bind(this)})), React.createElement("td", {"className": "east"}, React.createElement("div", {"className": "player-label"}, "E", React.createElement("br", null), "a", React.createElement("br", null), "s", React.createElement("br", null), "t"), React.createElement("div", null, React.createElement(Hand, {"hand": d.E, "enable": enables.E, "making": making.E, "onClick": makeClick('E')})))), React.createElement("tr", null, React.createElement("td", {"colSpan": 3, "className": "south", "style": { 'textAlign': 'center' }}, React.createElement("div", {"className": "player-label"}, "South"), React.createElement(Hand, {"oneRow": true, "hand": d.S, "enable": enables.S, "making": making.S, "onClick": makeClick('S')}))))));
    };
    return Deal;
})(React.Component);
/**
 * props:
 *   matrix: Output of calcDDTable()
 *   strain: currently selected strain
 *   declarer: currently selected declarer
 *   onClick: (strain: string, declarer: string) => void
 */
var DDMatrix = (function (_super) {
    __extends(DDMatrix, _super);
    function DDMatrix() {
        _super.apply(this, arguments);
    }
    DDMatrix.prototype.handleClick = function (strain, player) {
        if (this.props.onClick) {
            this.props.onClick(strain, player);
        }
    };
    DDMatrix.prototype.render = function () {
        var _this = this;
        var m = this.props.matrix;
        var ud = function (num) { return (num >= 7 ? 'up' : 'down'); };
        var makeCell = function (strain, player) {
            var tricks = m[strain][player];
            var selected = strain == _this.props.strain && player == _this.props.declarer;
            var className = [ud(tricks)].concat(selected ? ['selected'] : []).join(' ');
            var clickFn = _this.handleClick.bind(_this, strain, player);
            return (React.createElement("td", {"key": strain + player, "className": className, "onClick": clickFn}, tricks));
        };
        var rows = ['N', 'S', 'E', 'W'].map(function (player) { return (React.createElement("tr", {"key": player}, React.createElement("td", null, player), makeCell('N', player), makeCell('S', player), makeCell('H', player), makeCell('D', player), makeCell('C', player))); });
        return (React.createElement("table", {"className": "dd-matrix"}, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("th", null, ' '), React.createElement("th", {"className": "suit suit-N"}, "NT"), React.createElement("th", {"className": "suit suit-S"}, "♠"), React.createElement("th", {"className": "suit suit-H"}, "♥"), React.createElement("th", {"className": "suit suit-D"}, "♦"), React.createElement("th", {"className": "suit suit-C"}, "♣")), rows)));
    };
    return DDMatrix;
})(React.Component);
var Explorer = (function (_super) {
    __extends(Explorer, _super);
    function Explorer(props) {
        _super.call(this, props);
    }
    Explorer.prototype.handleClick = function (player, suit, rank) {
        var board = this.props.board;
        board.play(player, suit, rank);
        this.forceUpdate();
    };
    Explorer.prototype.handleUndo = function (player, suit, rank) {
        this.props.board.undoToCard(suit, rank);
        this.forceUpdate();
    };
    // Returns a {player -> [{suit, rank, score}, ...]} object.
    // score is tricks available to the declarer after each play.
    Explorer.prototype.getMaking = function (board) {
        var data = board.nextPlays();
        var player = data.player;
        var makingPlays = _.flatten(data.plays.map(function (_a) {
            var suit = _a.suit, rank = _a.rank, score = _a.score, equals = _a.equals;
            return [{ suit: suit, rank: rank, score: score }].concat(equals.map(function (rank) { return ({ suit: suit, rank: rank, score: score }); }));
        })).map(function (_a) {
            var suit = _a.suit, rank = _a.rank, score = _a.score;
            return ({ suit: suit, rank: textToRank(rank), score: score });
        });
        makingPlays.forEach(function (play) {
            if (onSameTeam(player, board.declarer)) {
                play.score += (player == 'E' || player == 'W') ? board.ew_tricks : board.ns_tricks;
            }
            else {
                play.score += (player == 'E' || player == 'W') ? board.ew_tricks : board.ns_tricks;
                play.score = 13 - play.score;
            }
        });
        return (_a = {},
            _a[player] = makingPlays,
            _a
        );
        var _a;
    };
    Explorer.prototype.render = function () {
        var board = this.props.board;
        var handleUndo = this.handleUndo.bind(this);
        var prevTricks = board.tricks.map(function (trick, i) { return React.createElement(Trick, {"key": i, "plays": trick.plays, "leader": trick.leader, "winner": trick.winner, "onClick": handleUndo}); });
        var legalPlays = board.legalPlays();
        var legalSuits = _.uniq(_.pluck(legalPlays, 'suit'));
        var legalSuit = legalSuits.length == 1 ? legalSuits[0] : 'all';
        var making = this.getMaking(board);
        return (React.createElement("div", null, React.createElement(Deal, {"deal": board.cards, "plays": board.plays, "leader": board.leader(), "legalSuit": legalSuit, "making": making, "onClick": this.handleClick.bind(this), "onUndo": handleUndo}), React.createElement("div", {"className": "score"}, React.createElement("p", null, board.ns_tricks, " North-South"), React.createElement("p", null, board.ew_tricks, " East-West")), React.createElement("div", {"className": "previous-tricks"}, prevTricks)));
    };
    return Explorer;
})(React.Component);
/**
 * props:
 *   initialPBN
 *   initialDeclarer
 *   initialStrain
 */
var Root = (function (_super) {
    __extends(Root, _super);
    function Root(props) {
        _super.call(this, props);
        this.state = {
            pbn: props.initialPBN,
            strain: props.initialStrain,
            declarer: props.initialDeclarer
        };
        this.board = this.makeBoard(this.state);
    }
    // Update in response to form changes.
    Root.prototype.handleFormSubmit = function (e) {
        e.preventDefault();
        this.setState({
            pbn: this.refs.pbn.value
        });
    };
    Root.prototype.handleDDClick = function (strain, declarer) {
        this.setState({ strain: strain, declarer: declarer });
    };
    Root.prototype.makeBoard = function (state) {
        return new Board(state.pbn, state.declarer, state.strain);
    };
    Root.prototype.componentDidMount = function () {
        this.updateUI();
    };
    Root.prototype.componentWillUpdate = function (nextProps, nextState) {
        this.board = this.makeBoard(nextState);
    };
    Root.prototype.componentDidUpdate = function () {
        this.updateUI();
    };
    Root.prototype.updateUI = function () {
        this.refs.pbn.value = this.state.pbn;
    };
    Root.prototype.render = function () {
        var handleFormSubmit = this.handleFormSubmit.bind(this);
        return (React.createElement("div", null, React.createElement("form", {"onSubmit": handleFormSubmit}, "PBN: ", React.createElement("input", {"type": "text", "size": "90", "ref": "pbn"})), React.createElement(DDMatrix, {"matrix": calcDDTable(this.state.pbn), "declarer": this.state.declarer, "strain": this.state.strain, "onClick": this.handleDDClick.bind(this)}), React.createElement(Explorer, {"board": this.board})));
    };
    return Root;
})(React.Component);
var pbn = 'N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4';
var declarer = 'W';
var strain = 'N';
var board = new Board(pbn, declarer, strain);
ddsReady.then(function () {
    ReactDOM.render(React.createElement(Root, {"initialPBN": pbn, "initialStrain": strain, "initialDeclarer": declarer}), document.getElementById('root'));
});
window.parsePBN = parsePBN;
window.Board = Board;
// to make the page load faster during development
calcDDTable.cache = { "N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4": { "N": { "N": 3, "S": 3, "E": 9, "W": 9 }, "S": { "N": 5, "S": 5, "E": 8, "W": 8 }, "H": { "N": 3, "S": 3, "E": 9, "W": 9 }, "D": { "N": 6, "S": 6, "E": 7, "W": 7 }, "C": { "N": 3, "S": 3, "E": 9, "W": 9 } } };
