import React, {Component} from 'react';
import { connect } from 'react-redux';

// import deepEqual from 'deep-equal'
// import LegendHeader from './LegendHeader'
// import SelectedDataPane from './SelectedDataPane'
// import EpochSlider from '../slider/epochSlider'

 class Legend extends Component {
  
  render() {
    const { theme, domain, range } = this.props
    let legendContainerStyle = {
      width: '100%',
      display: 'flex',
      color: theme.textColor 
    }

    let colorBlock = {
      alignItems: 'stretch',
      flexGrow: 1,
      height: 20
    }

    let textBlock = {
      width: (100/this.props.range.length)+'%',
      color: theme.textColor,
      display: 'inline-block',
      textAlign: 'right',
    }
    console.log('theme', theme.textColor)

    return (
      <div style={{width: '100%',  padding: 10, backgroundColor: theme.sidePanelHeaderBg}}>
        <h5 style={{color: theme.textColor }}>{this.props.title}</h5>
        <div className='legend-container' style={legendContainerStyle}>
          {range.map( color => <div key={color} style={Object.assign(Object.assign({},colorBlock), {backgroundColor: color })} /> )}
        </div>
        <div style={{width:'100%', position: 'relative', right: -3}}>
          { domain.map( dm => <div key={dm} style={textBlock} >{dm}</div> )}
          <div style={textBlock} ></div>
        </div>
      </div>
    );
  }
}

Legend.defaultProps = {
  title: 'Legend'
}

const mapDispatchToProps = {}

const mapStateToProps = state => {
  return {
    range: state.map.activeRange,
    domain: state.map.activeDomain,
    theme: state.map.theme
  }
};


export default connect(mapStateToProps, mapDispatchToProps)(Legend)