import React, {Component} from 'react';
// import { connect } from 'react-redux';

import styled from "styled-components"

// import deepEqual from 'deep-equal'
import SidebarContainer from './sidebar'
import SidebarHeader from './SidebarHeader'
import LayerSelector from './LayerSelector'
import ActiveLayers from './ActiveLayers'

const SidebarContent = styled.div`
  ${ props => props.theme.scrollBar };
  flex-grow: 1;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
`

class Sidebar extends Component {
  render() {
    let sidebarContentStyle = {
      flexGrow: 1,
      padding: 0,
      overflowY: 'auto',
      overflowX: 'hidden'
    }
    return (
      <SidebarContainer>
        <SidebarHeader header={ this.props.header }/>
        <SidebarContent className='sidebar-content' theme={ this.props.theme }>
          <LayerSelector { ...this.props }/>
          <ActiveLayers { ...this.props }/>
        </SidebarContent>
      </SidebarContainer>
    );
  }
}

export default Sidebar