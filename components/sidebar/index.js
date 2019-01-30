import React, {Component} from 'react';
// import { connect } from 'react-redux';

// import deepEqual from 'deep-equal'
import SidebarContainer from './sidebar'
import SidebarHeader from './SidebarHeader'
import LayerSelector from './LayerSelector'
import ActiveLayers from './ActiveLayers'

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
        <div className='sidebar-content' style={ sidebarContentStyle }>
          <LayerSelector { ...this.props }/>
          <ActiveLayers { ...this.props }/>
        </div>
      </SidebarContainer>
    );
  }
}

export default Sidebar