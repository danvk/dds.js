var SUIT_SYMBOLS = {
  'S': '♠',
  'H': '♥',
  'D': '♦',
  'C': '♣'
};
class Card extends React.Component {
  render() {
    var suit = this.props.suit;
    var suitSym = SUIT_SYMBOLS[suit];
    var rankSym = this.props.rank;
    if (rankSym == 'T') rankSym = '10';
    var orient = this.props.orient;
    var cardClass = 'card card-' + orient;
    if (this.props.hidden) {
      cardClass += ' hidden';
      return <div className={cardClass}><span className='rank'>{'\u00a0'}</span><span className='suit'>{'\u00a0'}</span></div>;
    }
    return (
        <div className={cardClass}>
          <span className='rank'>{rankSym}</span>
          <span className={'suit suit-'+suit}>{suitSym}</span>
        </div>
    );
  }
}

ReactDOM.render(
  <div>
    <Card orient='horiz' suit='S' rank='T' />
    <Card orient='horiz' suit='H' rank='A' />
    <Card orient='horiz' suit='C' rank='9' />
    <Card orient='horiz' suit='D' rank='2' />
    <Card hidden={true} orient='horiz' suit='D' rank='2' />
    <Card orient='vert' suit='S' rank='T' />
    <Card orient='vert' suit='H' rank='A' />
    <Card orient='vert' suit='C' rank='9' />
    <Card orient='vert' suit='D' rank='2' />
    <Card hidden={true} orient='vert' suit='C' rank='9' />
  </div>,
  document.getElementById('root')
);
