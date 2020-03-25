import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {scaleLinear} from 'd3-scale';
import * as d3selection from 'd3-selection'
import {max} from 'd3-array';

import styled from "styled-components"

const chartMargin = {top: 18, bottom: 0, left: 0, right: 0};
const chartH = 52;
const containerH = 78;
const histogramStyle = {
  highlightW: 1,
  unHighlightedW: 0.4
};

const Rect = styled.rect`
  fill: ${ props => props.inRange ? props.theme.activeColor : props.theme.sliderBarColor };
`

export default class RangePlot extends Component {
  constructor(props) {
    super(props);

    this.container = React.createRef()
  }
  static propTypes = {
    value: PropTypes.number.isRequired,
    bargraph: PropTypes.arrayOf(
      PropTypes.shape({
        x: PropTypes.number,
        y: PropTypes.number
      })
    ),
    width: PropTypes.number.isRequired
  };

  componentDidMount() {
    d3selection.select(this.container.current)
      .on("click", e => {
        const { width, onClick, range } = this.props,
          pos = d3selection.mouse(this.container.current);
        onClick(Math.floor(range[0] + (range[1] - range[0]) * (pos[0] / width)))
      });
  }

  render() {
    const {
      value,
      width,
      bargraph
    } = this.props;

    return (
      <div ref={ this.container }
        style={{
          height: `${containerH}px`,
          position: 'relative'
        }}
      >
      { !bargraph || !bargraph.length ? null :
        <BarGraph
          width={width}
          height={chartH}
          value={value}
          margin={chartMargin}
          bargraph={bargraph}
        />
      }
      </div>
    );
  }
}

const BarGraph = ({
  width,
  height,
  margin,
  bargraph,
  value
}) => {
  const domain = [bargraph[0].x, bargraph[bargraph.length - 1].x];
  const barWidth = width / bargraph.length;

  const x = scaleLinear()
    .domain(domain)
    .range([0, width]);

  const y = scaleLinear()
    .domain([0, max(bargraph, d => d.y)])
    .range([0, height]);

  return (
    <svg width={width} height={height} style={{marginTop: `${margin.top}px`}}>
      <g className="histogram-bars">
        {bargraph.map(bar => {
          const inRange = bar.x == value;
          const wRatio = inRange ? histogramStyle.highlightW : histogramStyle.unHighlightedW;
          const h = y(bar.y);

          return (
            <Rect inRange={ inRange }
              key={bar.x}
              height={h}
              width={barWidth * wRatio}
              x={x(bar.x) + barWidth * (1 - wRatio) / 2}
              rx={1}
              ry={1}
              y={height - h}
            />
          );
        })}
      </g>
    </svg>
  );
};
