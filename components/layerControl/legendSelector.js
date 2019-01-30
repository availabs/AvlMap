import React, {Component} from 'react';
// import { connect } from 'react-redux';

import styled from 'styled-components';
import {
  PanelLabel,
  StyledPanelDropdown
} from 'components/common/styled-components';
import onClickOutside from 'react-onclickoutside';

import SingleSelectFilter from 'components/filters/single-select-filter'

import ColorPalette from "./colorPalette"
import COLOR_RANGES from "constants/color-ranges"

const StyledFilterPanel = styled.div`
  margin-bottom: 12px;
  border-radius: 1px;
  padding-left: 12px;
  padding-right: 12px;
  .filter-panel__filter {
    margin-top: 24px;
  }
`;

class ColorSelector extends Component {

  constructor(props) {
    super(props);
    this.state = {
      editing: false,
      length: props.layer.legend.range.length,
      isReversed: false,
      type: props.layer.legend.type
    }
  }

  componentDidUpdate(oldProps, oldState) {
    if ((this.state.type !== this.props.layer.legend.type) ||
      (this.props.layer.legend.type === "ordinal" && this.state.length !== this.props.layer.legend.range.length)) {
      this.setState({
        length: this.props.layer.legend.range.length,
        type: this.props.layer.legend.type
      })
    }
  }

  handleClickOutside = e => {
    if (this.state.editing !== false) {
      this.setState({ editing: false });
    }
  };

  _onSelectColor = (color, e) => {
    e.stopPropagation();
    if (this.props.colorSets[this.state.editing]) {
      this.props.colorSets[this.state.editing].setColor(color);
    }
  };

  _showDropdown = e => {
    e.stopPropagation();
    e.preventDefault();
    this.setState({ editing: true });
  };

  render() {
    const legend = this.props.layer.legend;
    return (
      <StyledFilterPanel>
        <div onClick={ this._showDropdown.bind(this) }>
          <PanelLabel>Legend</PanelLabel>
          <ColorPalette colors={ legend.range }/>
        </div>
        { !this.state.editing ? null :
          <StyledPanelDropdown className="color-selector__dropdown">
            <div style={{height:"5px"}}/>
            { legend.types && legend.types.length <= 1 ? null :
              <SingleSelectFilter filter={ {
                  name: "Scale Type",
                  domain: legend.types,
                  value: legend.type
                } }
                setFilter={ type => this.props.updateLegend(this.props.layer.name, { type }) }/>
            }
            { legend.type === "ordinal" ? null :
              <SingleSelectFilter filter={ {
                  name: "Steps",
                  domain: Object.keys(COLOR_RANGES),
                  value: this.state.length
                } }
                setFilter={ length => this.setState({ length }) }/>
            }
          {
            COLOR_RANGES[this.state.length]
              .filter(cr => legend.type !== "ordinal" || cr.type === "qualitative")
              .map((cr, i) => {
                return <div key={ i } onClick={ e => this.props.updateLegend(this.props.layer.name, { range: cr.colors.slice() }) }>
                  <ColorPalette colors={ cr.colors }
                    isReversed={ this.state.isReversed }
                    isSelected={ (cr.colors.length === legend.range.length) && cr.colors.reduce((a, c, i) => a && c === legend.range[i], true) }
                  />
                </div>
              })
          }
          </StyledPanelDropdown>
        }
      </StyledFilterPanel>
    );
  }
};
export default onClickOutside(ColorSelector)