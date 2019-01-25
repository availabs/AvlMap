import React, {Component} from 'react';
import styled from 'styled-components';
// import PropTypes from 'prop-types';
import classnames from 'classnames';
import {CenterFlexbox} from 'components/common/styled-components';
import {Pin, Layers} from 'components/common/icons';

const MAX_WIDTH = 400;
const MAX_HEIGHT = 600;

const StyledMapPopover = styled.div`
  ${props => props.theme.scrollBar}
  font-size: 11px;
  font-weight: 500;
  background-color: ${props => props.theme.panelBackground};
  color: ${props => props.theme.textColor};
  z-index: 1001;
  position: absolute;
  overflow-x: auto;
  .gutter {
    height: 6px;
  }
  table {
    margin: 2px 12px 12px 12px;
    width: auto;
    tbody {
      border-top: transparent;
      border-bottom: transparent;
    }
    td {
      border-color: transparent;
      padding: 4px;
      color: ${props => props.theme.textColor};
    }
    td.row__value {
      text-align: right;
      font-weight: 500;
      color: ${props => props.theme.textColorHl};
    }
  }
`;

const StyledPin = styled.div`
  position: absolute;
  left: 50%;
  transform: rotate(30deg);
  top: 10px;
  color: ${props => props.theme.primaryBtnBgd};
  :hover {
    cursor: pointer;
    color: ${props => props.theme.linkBtnColor};
  }
`;

const StyledLayerName = CenterFlexbox.extend`
  color: ${props => props.theme.textColorHl};
  font-size: 12px;
  letter-spacing: 0.43px;
  text-transform: capitalize;
  padding-left: 14px;
  padding-right: 14px;
  margin-top: 12px;
  svg {
    margin-right: 4px;
  }
`;

export class MapPopover extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isMouseOver: false,
      width: 380,
      height: 160
    };
  }

  componentDidMount() {
    this._setContainerSize();
  }

  componentDidUpdate() {
    this._setContainerSize();
  }

  _setContainerSize() {
    const node = this.popover;
    if (!node) {
      return;
    }

    const width = Math.min(node.scrollWidth, MAX_WIDTH);
    const height = Math.min(node.scrollHeight, MAX_HEIGHT);

    if (width !== this.state.width || height !== this.state.height) {
      this.setState({width, height});
    }
  }

  _getPosition(x, y) {
    const topOffset = 30;
    const leftOffset = 30;
    // const {mapState} = this.props;
    // const {width, height} = this.state;
    const pos = {};
    // if (x + leftOffset + width > mapState.width) {
    //   pos.right = mapState.width - x + leftOffset;
    // } else {
      pos.left = x + leftOffset;
    // }

    // if (y + topOffset + height > mapState.height) {
    //   pos.bottom = 10;
    // } else {
      pos.top = y + topOffset;
    // }

    return pos;
  }

  render() {
    const {
      pinned,
      data,
      pos
    } = this.props;
    const hidden = !data.length && !this.state.isMouseOver;
    // const { width } = this.state;

    if (!data.length) {
      return null;
    }

    const [x, y] = pos;

    const style =
      Number.isFinite(x) && Number.isFinite(y) ? this._getPosition(x, y) : {};

    const hasHeader = !Array.isArray(data[0]);

    return (
      <StyledMapPopover
        innerRef={comp => {
          this.popover = comp;
        }}
        className={classnames('map-popover', {hidden})}
        style={{
          ...style
        }}
        onMouseEnter={() => {
          this.setState({ isMouseOver: true });
        }}
        onMouseLeave={() => {
          this.setState({ isMouseOver: false });
        }}>

        { pinned ?
          <div className="map-popover__top">
            <div className="gutter" />
            <StyledPin className="popover-pin" onClick={e => this.props.updatePopover({ pinned: false, data: [] })}>
              <Pin height="16px" />
            </StyledPin>
          </div>
        : null }
        { hasHeader ?
          <StyledLayerName className="map-popover__layer-name">
            <Layers height="12px"/>{ data[0] }
          </StyledLayerName>
        : null }
        { !hasHeader || (hasHeader && data.length > 1) ?
          <table className="map-popover__table">
            <tbody>
              {
                data.slice(hasHeader ? 1 : 0)
                  .map(Row)
              }
            </tbody>
          </table>
        : null }
      </StyledMapPopover>
    );
  }
}

const Row = ([name, value]) =>
  <tr key={ name }>
    <td className="row__name">{ name }</td>
    <td className="row__value">{ value }</td>
  </tr>

export default MapPopover