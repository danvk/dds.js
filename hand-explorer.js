'N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4'

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

var SUITS = ['S', 'H', 'D', 'C'];

var NEXT_PLAYER = {
  'N': 'E',
  'E': 'S',
  'S': 'W',
  'W': 'N'
};

function parsePBN(pbn: string) {
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
  parts.forEach((txt, i) => {
    deal[player] = {};
    var suits = txt.split('.');
    if (suits.length != 4) {
      throw `${player} must have four suits, got ${suits.length}: ${txt}`;
    }
    suits.forEach((holding, idx) => {
      deal[player][SUITS[idx]] = [].map.call(holding, textToRank);
    });
    player = NEXT_PLAYER[player];
  });
  return deal;
}
window.parsePBN = parsePBN;

var SUIT_SYMBOLS = {
  'S': '♠',
  'H': '♥',
  'D': '♦',
  'C': '♣'
};

/**
 * props:
 *   suit: {'S', 'H', 'D', 'C'}
 *   rank: {'1'..'9', 'T', 'J', 'Q', 'K', 'A'}
 *   facedown: {false, true}
 */
class Card extends React.Component {
  render() {
    var suit = this.props.suit;
    var suitSym = SUIT_SYMBOLS[suit];
    var rankSym = this.props.rank;
    if (rankSym == 'T') rankSym = '10';
    if (rankSym == 11) rankSym = 'J';
    if (rankSym == 12) rankSym = 'Q';
    if (rankSym == 13) rankSym = 'K';
    if (rankSym == 14) rankSym = 'A';
    if (this.props.facedown) {
      return (
          <div className='card facedown'>
            <span className='rank'>{'\u00a0'}</span>
            <span className='suit'>{'\u00a0'}</span>
          </div>
        );
    } else {
      return (
          <div className='card'>
            <span className='rank'>{rankSym}</span>
            <span className={'suit suit-' + suit}>{suitSym}</span>
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
 */
class Hand extends React.Component {
  render() {
    var cards = {};
    for (var suit in this.props.hand) {
      var holding = this.props.hand[suit];
      cards[suit] = holding.map(rank => <Card key={rank} suit={suit} rank={rank} />);
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
 *   lead: 'W'
 */
class Trick extends React.Component {
  render() {
  }
}

/**
 * props:
 *   deal: (parsed PBN)
 *   plays: [{suit: 'S', rank: 14}, ...]
 *   lead: 'W'
 */
class Deal extends React.Component {
  render() {
    var d = this.props.deal;
    return (
      <table className="deal">
        <tbody>
          <tr>
            <td colSpan={3} className="north" style={{'textAlign': 'center'}}>
              <Hand oneRow={true} enable='none' hand={d['N']} />
              <div className="player-label">
                North
              </div>
            </td>
          </tr>
          <tr>
            <td className="west">
              <div>
                <Hand hand={d['W']} />
              </div>
              <div className="player-label">
              W<br/>
              e<br/>
              s<br/>
              t
              </div>
            </td>
            <td className="plays">
              (Plays)
            </td>
            <td className="east">
              <div className="player-label">
              E<br/>
              a<br/>
              s<br/>
              t
              </div>
              <div>
                <Hand hand={d['E']} />
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="south" style={{'textAlign': 'center'}}>
              <div className="player-label">
                South
              </div>
              <Hand oneRow={true} enable='D' hand={d['S']} />
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

var deal = parsePBN('N:T843.K4.KT853.73 J97.J763.642.KJ5 Q52.Q982.QJ.9862 AK6.AT5.A97.AQT4')

ReactDOM.render(
  <div>
    <Deal deal={deal} />
  </div>,
  document.getElementById('root')
);
