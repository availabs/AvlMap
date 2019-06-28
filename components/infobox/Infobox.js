import React, {Component} from 'react';

import styled from "styled-components"

import Legend from '../legend/Legend'

const InfoBoxContainer = styled.div`
  position: relative;
  min-height: 22px;
`
const ToggleButton = styled.span`
  position: absolute;
  top: 0px;
  right: 0px;
  padding: 5px;
  border-radius: 4px;
  background-color: transparent;
  transition: background-color 0.15s;

  :hover {
    background-color: #666;
  }
`
const CollapsedInfoBox = styled.div`
  color: ${ props => props.theme.textColor };
  font-weight: bold;
  font-size: 1.5rem;
`

class InfoBox extends Component {

  state = {
    collapsedInfoBoxes: []
  }

  toggleInfoBox(id) {
    const { collapsedInfoBoxes } = this.state;
    if (collapsedInfoBoxes.includes(id)) {
      this.setState({ collapsedInfoBoxes: collapsedInfoBoxes.filter(d => d !== id) });
    }
    else {
      this.setState({ collapsedInfoBoxes: [...collapsedInfoBoxes, id] });
    }
  }

  getToggleButton(id) {
    return `fa fa-lg
      ${ this.state.collapsedInfoBoxes.includes(id) ? "fa-chevron-down" : "fa-chevron-up" }
    `;
  }

  render() {

    const { theme, layers } = this.props,
      activeLayers = layers.filter(l => l.active),
      activeLegends = activeLayers.reduce((a, c) => c.legend && c.legend.active && c.legend.domain.length ? a.concat(c.legend) : a, []),
      activeInfoBoxes = activeLayers
        .reduce((a, c) => 
          c.infoBoxes ?
            a.concat(
              Object.keys(c.infoBoxes)
                .map((key, i) => ({
                  title: `Info Box ${ key }`,
                  ...c.infoBoxes[key],
                  id: `${ c.name }-${ key }`,
                  layer: c
                }))
                .filter(i => i.show)
            )
            : a
        , []),

      isOpen = activeLegends.length || activeInfoBoxes.length;

    let sideBarContainerStyle = {
      width: isOpen ? "400px" : "0px",
      zIndex: 99,
      display: 'flex',
      position: 'absolute',
      top: 0,
      right: 0,
      padding: "20px",
      maxHeight: '100vh'
    }

    let sidebarStyle = {
      alignItems: 'stretch',
      flexGrow: 1
    }

    let sidebarInnerStyle = {
      backgroundColor: theme.sidePanelBg,
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }

    let sidebarContentStyle = {
      flexGrow: 1,
      padding: isOpen ? "10px" : "0px",
      overflowY: 'auto',
      overflowX: 'hidden',
      color: '#efefef'
    }
    return (
      <div className='sidebar-container' style={sideBarContainerStyle}>
        <div className='sidebar' style={sidebarStyle}>
          <div className='sidebar-inner' style={sidebarInnerStyle}>
            <div className='sidebar-content' style={sidebarContentStyle}>
              {
                activeLegends.map((l, i) => <Legend key={ i } theme={ this.props.theme } { ...l }/>)
              }
              {
                activeInfoBoxes.map((b, i) =>
                  <InfoBoxContainer key={ i }>
                    { this.state.collapsedInfoBoxes.includes(b.id) ?  
                        (typeof b.title === "function") ?
                          <b.title layer={ b.layer }/>
                        : <CollapsedInfoBox>{ b.title }</CollapsedInfoBox>
                      : <b.comp theme={ this.props.theme }/>
                    }
                    <ToggleButton className={ this.getToggleButton(b.id) }
                      onClick={ () => this.toggleInfoBox(b.id) }/>
                  </InfoBoxContainer>
                )
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default InfoBox