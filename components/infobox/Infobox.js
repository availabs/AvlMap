import React, {Component} from 'react';
// import { connect } from 'react-redux';

import Legend from '../legend/Legend'
// import TMCInspector from './tmcInspector'

 class InfoBox extends Component {

  render() {

    const { theme, layers } = this.props,
      activeLayers = layers.filter(l => l.active),
      activeLegends = activeLayers.reduce((a, c) => c.legend && c.legend.active && c.legend.domain.length ? a.concat(c.legend) : a, []),
      activeInfoBoxes = activeLayers.reduce((a, c) => c.infoBoxes ? a.concat(Object.values(c.infoBoxes).filter(i => i.show)) : a, []),

      isOpen = activeLegends.length || activeInfoBoxes.length;

    let sideBarContainerStyle = {
      width: isOpen ? "400px" : "0px",
      zIndex: 99,
      display: 'flex',
      position: 'absolute',
      top: 0,
      right: 0,
      padding: "20px"
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
                activeInfoBoxes.map(i => <i.comp key={ i }/>)
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default InfoBox