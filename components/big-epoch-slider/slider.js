import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import styled from 'styled-components';

import SliderHandle from '../slider/slider-handle';
// import SliderBarHandle from '../slider/slider-bar-handle';

function noop() {}

const StyledRangeSlider = styled.div`
  position: relative;
  margin-bottom: 12px;
  background-color: ${props => props.theme.sliderBarBgd};
  height: ${props => props.theme.sliderBarHeight};
`;

const SliderWrapper = styled.div`
  flex-grow: 1;
  margin-top: 0px;
`;

export default class Slider extends Component {
  static propTypes = {
    title: PropTypes.string,
    value: PropTypes.number,
    minValue: PropTypes.number,
    maxValue: PropTypes.number,
    sliderHandleWidth: PropTypes.number,
    onSlider0Change: PropTypes.func,
    onInput0Change: PropTypes.func,
    onSlider1Change: PropTypes.func,
    onInput1Change: PropTypes.func,
    step: PropTypes.number
  };

  static defaultProps = {
    title: '',
    value: 0,
    minValue: 0,
    maxValue: 100,
    step: 1,
    sliderHandleWidth: 12,
    onSlider0Change: noop,
    onInput0Change: noop,
    onSlider1Change: noop,
    onInput1Change: noop,
    onSliderBarChange: noop,
    disabled: false
  };

  ref = undefined;

  _saveRef = ref => {
    this.ref = ref;
  };

  slideListener = x => {
    const xPercent = x / this.ref.offsetWidth;
    const maxDelta = this.props.maxValue - this.props.minValue;
    const val = xPercent * maxDelta;
    this.props.onSliderChange.call(this, val + this.props.value);
  };

  calcHandleLeft = l => {
    return `calc(${l}% - ${this.props.sliderHandleWidth / 2}px)`;
  };

  createSlider = left => {
    return (
      <div>
        <StyledRangeSlider className="kg-range-slider">
          <SliderHandle
            className="kg-range-slider__handle"
            left={this.calcHandleLeft(left)}
            valueListener={this.slideListener}
            sliderHandleWidth={this.props.sliderHandleWidth}
          />
        </StyledRangeSlider>
      </div>
    );
  };

  render() {
    const {
      classSet,
      maxValue,
      // minValue,
      value
    } = this.props;

    return (
      <SliderWrapper
        className={classnames('kg-slider', {...classSet})}
        ref={this._saveRef}
      >
        {this.createSlider(value / maxValue * 100)}
      </SliderWrapper>
    );
  }
}
