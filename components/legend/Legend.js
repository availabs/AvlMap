import React, {Component} from 'react';
// import { connect } from 'react-redux';

// import deepEqual from 'deep-equal'
// import LegendHeader from './LegendHeader'
// import SelectedDataPane from './SelectedDataPane'
// import EpochSlider from '../slider/epochSlider'

import * as d3scale from "d3-scale"
import * as d3format from "d3-format"

const Title = ({ Title, layer, theme }) =>
  <h5 style={ { color: theme.textColorHl } }>
    { typeof Title === "function" ?
      <Title layer={ layer }/>
      : Title
    }
  </h5>

const HorizontalLegend = ({ theme, type, format, scale, range, domain, title, layer }) => {
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
    width: (100 / (type === 'linear' ? scale.ticks(5).length : range.length)) + '%',
    color: theme.textColor,
    display: 'inline-block',
    textAlign: 'right',
  }
  return (
    <div style={{width: '100%',  padding: 10, backgroundColor: theme.sidePanelHeaderBg}}>
      <Title Title={ title } layer={ layer } theme={ theme }/>
      <div className='legend-container' style={legendContainerStyle}>
        {
          type === "linear" ?
            scale.ticks(5).map(t => <div key={ t } style={ { ...colorBlock , backgroundColor: scale(t) } }/>)
          :
            range.map((r, i) => <div key={ i } style={ { ...colorBlock, backgroundColor: r } }/>)
        }
      </div>
      <div style={{width:'100%', position: 'relative', right: -3}}>
        {
          type === "ordinal" ?
            domain.map(d => <div key={ d } style={ textBlock } >{ format(d) }</div>)
          : type === "linear" ?
            scale.ticks(5).map(t => <div key={ t } style={ textBlock }>{ format(t) }</div>)
          :
            range.map((r, i) => <div key={ i } style={ textBlock }>{ typeof scale.invertExtent(r)[1] === "number" ? format(scale.invertExtent(r)[1]) : null }</div>)
        }
      </div>
    </div>
  )
}

const VerticalLegend = ({ theme, type, format, scale, range, domain, title, layer }) => {
  range = (type === "linear") ? scale.ticks(5).map(t => scale(t)) : range
  return (
    <div style={ { width: "100%", padding: "10px", backgroundColor: theme.sidePanelHeaderBg } }>
      <Title Title={ title } layer={ layer } theme={ theme }/>
      <table>
        <tbody>
          {
            type === "ordinal" ?
              domain.map(d =>
                <tr key={ d }>
                  <td>
                    <div style={ { width: "20px", height: "20px", backgroundColor: scale(d) } }/>
                  </td>
                  <td style={ { paddingLeft: "5px" } }>
                    { format(d) }
                  </td>
                </tr>
              )
            : null
          }
        </tbody>
      </table>
    </div>
  )
}

 class Legend extends Component {

  getScale() {
    switch (this.props.type) {
      case "ordinal":
        return d3scale.scaleOrdinal();
      case "quantile":
        return d3scale.scaleQuantile();
      case "quantize":
        return d3scale.scaleQuantize();
      case "threshold":
        return d3scale.scaleThreshold();
      default:
        return d3scale.scaleLinear();
    }
  }

  render() {
    let { vertical, format, domain, range } = this.props;

    const scale = this.getScale()
      .domain(domain)
      .range(range);

    if (typeof format === "string") {
      format = d3format.format(format);
    }

    return vertical ?
      <VerticalLegend { ...this.props }
        scale={ scale } format={ format }/>
    :
      <HorizontalLegend { ...this.props }
        scale={ scale } format={ format }/>;
  }
}

Legend.defaultProps = {
  title: 'Legend',
  range: [],
  domain: [],
  type: "linear",
  format: d => d,
  vertical: false
}

export default Legend
