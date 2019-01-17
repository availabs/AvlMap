import React, {Component} from 'react';
// import deepEqual from 'deep-equal'

 class SidebarHeader extends Component {
  
  render() {
    
    let sidebarHeaderStyle = {
      width: '100%',
      flexBasis: 75,
      display: 'flex',
      padding: 15,
      backgroundColor: '#29323C' //theme.sidePanelHeaderBg// '#323c58', //'#29323C'
    }


    return (
      <div className='sidebar-header' style={sidebarHeaderStyle}>
        <this.props.header />
      </div>
    );
  }
}


export default SidebarHeader