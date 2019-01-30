import React, {Component} from 'react';
// import { connect } from 'react-redux';

 class LayerSelector extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false
    };
    this.toggleDropdown = this.toggleDropdown.bind(this)
    this.closeDropdown = this.closeDropdown.bind(this)
    this.addLayer = this.addLayer.bind(this)
  }

  toggleDropdown () { this.setState({ open: !this.state.open }) }

  closeDropdown () { this.setState({ open: false }) }

  addLayer (e) {
    this.props.addLayer(e.target.getAttribute("value"))
    this.closeDropdown()
  }

  render() {
    const { theme, layers } = this.props
    let LayerSelectorStyle = {
      width: '100%',
      display: 'flex',
      padding: 5,
    }

    return (
      <div className='sidebar-header' style={LayerSelectorStyle}>
        <div className='dropdown' style={{ width: '100%'}}>
          <button 
            onClick={this.toggleDropdown}
            onFocusOut={this.closeDropdown}
            style={{borderRadius: 0,  backgroundColor: theme.sidePanelBg, color: theme.textColorHl}}
            className="btn btn-block dropdown-toggle" 
            type="button" id="dropdownMenuButton" data-toggle="dropdown" aria-haspopup="true">
            Add Layer
          </button>
          <div className="dropdown-menu" aria-labelledby="dropdownMenuButton"
            style={this.state.open ? {display:'block'} : {display:'none'}}>
              { 
                layers.filter(layer => !layer.active)
                .map(layer =>
                  <span key={ layer.name } className="dropdown-item" value={ layer.name } onClick={ this.addLayer }>
                    { layer.name }
                  </span>
                )
              }
              
          </div>
        </div>
      </div>
    );
  }
}

export default LayerSelector