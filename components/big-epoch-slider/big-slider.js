import React, {Component} from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

import SliderPlot from './slider-plot';
import Slider from './slider';
import { Input } from '../common/styled-components';

import { roundValToStep } from '../time-range-slider/utils';

const SliderInput = styled(Input)`
  height: 24px;
  width: 40px;
  padding: 4px 6px;
  margin-left: ${props => props.flush ? 0 : 24}px;
`;

const SliderWrapper = styled.div`
  display: flex;
  position: relative;
`;

// const RangeInputWrapper =styled.div`
//   margin-top: 6px;
//   display: flex;
//   justify-content: space-between;
// `;

export default class RangeSlider extends Component {
  static propTypes = {
    range: PropTypes.arrayOf(PropTypes.number).isRequired,
    value: PropTypes.number.isRequired,
    onChange: PropTypes.func.isRequired,
    bargraph: PropTypes.arrayOf(PropTypes.any),
    isEnlarged: PropTypes.bool,
    inputTheme: PropTypes.string,
    step: PropTypes.number,
    sliderHandleWidth: PropTypes.number,
    xAxis: PropTypes.func
  };

  static defaultProps = {
    isEnlarged: false,
    sliderHandleWidth: 12
  };

  state = { value: 0, width: 288 };

  componentDidMount() {
    this._setValueFromProps(this.props);
    this._resize();
  }

  componentWillReceiveProps(nextProps) {
    this._setValueFromProps(nextProps);
  }

  componentDidUpdate() {
    this._resize();
  }

  _setValueFromProps = props => {
    const {value} = props;

    if (!isNaN(value)) {
      this.setState({value});
    }
  };

  _isValInRange = val => {
    const {range} = this.props;

    return Boolean(val >= range[0] && val <= range[1]);
  };

  _roundValToStep = val => {
    const {range, step} = this.props;

    return roundValToStep(range[0], step, val);
  };

  _setRangeVal = val => {
    const { onChange} = this.props;
    val = Number(val);

    if (this._isValInRange(val)) {
      onChange(this._roundValToStep(val));
      return true;
    }
    return false;
  };

  _resize() {
    const width = this.sliderContainer.offsetWidth;
    if (width !== this.state.width) {
      this.setState({width});
    }
  }

  _renderInput(key) {
    const setRange = this._setRangeVal;
    const update = e => {
      if (!setRange(e.target.value)) {
        this.setState({[key]: this.state[key]});
      }
    };

    return (
      <SliderInput
        className="kg-range-slider__input"
        type="number"
        ref={comp => {
          this[`input-${key}`] = comp;
        }}
        id={`filter-${key}`}
        value={this.state[key]}
        onChange={e => {
          this.setState({[key]: e.target.value});
        }}
        onKeyPress={e => {
          if (e.key === 'Enter') {
            update(e);
            this[`input-${key}`].blur();
          }
        }}
        onBlur={update}
        flush={key === 'value0'}
        secondary={this.props.inputTheme === 'secondary'}
      />
    );
  }

  render() {
    const {
      // isRanged,
      bargraph,
      isEnlarged,
      range,
      onChange,
      value,
      sliderHandleWidth
    } = this.props;

    const height = this.props.xAxis ? '24px' : '16px';
    const {width} = this.state;
    const plotWidth =  width - sliderHandleWidth;

    return (
      <div
        className="kg-range-slider" style={{width: '100%', padding: `0 ${sliderHandleWidth / 2}px`}}
        ref={comp => {
          this.sliderContainer = comp;
        }}>
        {bargraph && bargraph.length ? (
          <SliderPlot
            bargraph={bargraph}
            isEnlarged={isEnlarged}
            onClick={val => {
              onChange(val);
            }}
            range={range}
            value={value}
            width={plotWidth}
          />
        ) : null}
        <SliderWrapper
          style={{height}}
          className="kg-range-slider__slider">
          {this.props.xAxis ? <this.props.xAxis width={plotWidth} domain={range}/> : null}
          <Slider
            showValues={false}
            minValue={range[0]}
            maxValue={range[1]}
            value={value}
            handleWidth={sliderHandleWidth}
            onSliderChange={this._setRangeVal}
          />
        </SliderWrapper>
      </div>
    );
  }
};
