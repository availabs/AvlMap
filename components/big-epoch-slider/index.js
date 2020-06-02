import React, {Component} from 'react';
import PropTypes from 'prop-types';
// import moment from 'moment';
// import { requestAnimationFrame, cancelAnimationFrame } from 'global/window';
import classnames from 'classnames';
import throttle from 'lodash.throttle';
import styled from 'styled-components';
import { Play, Reset, Pause } from '../common/icons';
import { Button, ButtonGroup } from '../common/styled-components';
import BigSlider from './big-slider';
import TimeSliderMarker from './time-slider-marker';

const BASE_SPEED = 25;

// const defaultTimeFormat = val => moment.utc(val).format('MM/DD/YY hh:mma');
const animationControlWidth = 140;

const StyledSliderContainer = styled.div`
  margin-top: ${props => props.isEnlarged ? '12px' : '0px'};
  align-items: flex-end;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

export default class TimeRangeSlider extends Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    domain: PropTypes.arrayOf(PropTypes.number).isRequired,
    value: PropTypes.number.isRequired,
    step: PropTypes.number.isRequired,
    bargraph: PropTypes.arrayOf(PropTypes.any),
    toggleAnimation: PropTypes.func.isRequired,
    isAnimatable: PropTypes.bool,
    isEnlarged: PropTypes.bool,
    speed: PropTypes.number
  };
  static defaultProps = {
    step: 1,
    isAnimatable: true,
    isEnlarged: true,
    speed: 1
  }

  constructor(props) {
    super(props);
    this.state = {
      isAnimating: false,
      width: 288
    };
    this._animation = null;
    this._sliderThrottle = throttle(value => this.props.onChange(value), 20);
  }

  componentDidUpdate() {
    if (!this._animation && this.state.isAnimating) {
      this._animation = setTimeout(this._nextFrame, BASE_SPEED);
    }
  }

  _sliderUpdate = value => {
    this._sliderThrottle.cancel();
    this._sliderThrottle(value);
  };

  _resetAnimation = () => {
    const {domain} = this.props;
    const value = domain[0];
    this.props.onChange(value);
  };

  _startAnimation = () => {
    this._pauseAnimation();
    this.props.toggleAnimation();
    this.setState({isAnimating: true});
  };

  _pauseAnimation = () => {
    if (this._animation) {
      clearTimeout(this._animation);
      this.props.toggleAnimation();
      this._animation = null;
    }
    this.setState({isAnimating: false});
  };

  _nextFrame = () => {
    this._animation = null;
    const { value, domain, step } = this.props;
    const newValue = value + step > domain[1] ? domain[0] : value + 1;
    this.props.onChange(newValue);
  };

  render() {
    const { domain, value, isEnlarged, Title, Comp } = this.props;
    const { isAnimating } = this.state;

    return (
      <div className="time-range-slider">
        { Title ? <Title /> : null }
        <StyledSliderContainer
          className="time-range-slider__container"
          isEnlarged={isEnlarged}>
          {isEnlarged ? <AnimationControls
            isAnimatable={this.props.isAnimatable}
            isEnlarged={isEnlarged}
            isAnimating={isAnimating}
            pauseAnimation={this._pauseAnimation}
            resetAnimation={this._resetAnimation}
            startAnimation={this._startAnimation}
          /> : null}
          <div style={{width: isEnlarged ? `calc(100% - ${animationControlWidth}px)` : '100%'}}>
            { Comp ? <Comp /> : null }
            <BigSlider
              range={domain}
              value={value}
              bargraph={this.props.bargraph}
              isEnlarged={isEnlarged}
              step={this.props.step}
              onChange={this._sliderUpdate}
              xAxis={TimeSliderMarker}
            />
          </div>
        </StyledSliderContainer>
      </div>
    );
  }
}

// const TimeValueWrapper = styled.div`
//   display: flex;
//   height: ${props => props.theme.secondaryInputHeight};
//   align-items: center;
//   font-size: 11px;
//   justify-content: ${props => props.isEnlarged ? 'center' : 'space-between'};
//   color: ${props => props.theme.labelColor};
//   .horizontal-bar {
//     padding: 0 12px;
//   }
//   .time-value {
//     display: flex;
//     flex-direction: ${props => props.isEnlarged ? 'row' : 'column'};
//     align-items: flex-start;
//   }
//   .time-value:last-child {
//     align-items: flex-end;
//   }
// `;

// const TimeTitle = ({value, isEnlarged, timeFormat = defaultTimeFormat}) => (
//   <TimeValueWrapper isEnlarged={isEnlarged}>
//     <TimeValue key={0} value={moment.utc(value[0]).format(timeFormat)} split={!isEnlarged}/>
//     {isEnlarged ? (
//       <div className="horizontal-bar">
//         <Minus height="12px"/>
//       </div>
//     ) : null}
//     <TimeValue key={1} value={moment.utc(value[1]).format(timeFormat)} split={!isEnlarged}/>
//   </TimeValueWrapper>
// );

// const TimeValue = ({value, split}) => (
//   // render two lines if not enlarged
//   <div className="time-value">
//     {split ? value.split(' ').map((v, i) => (
//       <div key={i}>
//         {i === 0 ? <SelectText>{v}</SelectText> :
//         <SelectTextBold>{v}</SelectTextBold>}
//       </div>
//     )) : <SelectTextBold>{value}</SelectTextBold>}
//   </div>
// );

const StyledAnimationControls = styled.div`
  margin-bottom: 12px;
  margin-right: 42px;
  &.disabled {
    opacity: 0.4;
    pointer-events: none;
  }
`;

const IconButton = styled(Button)`
  svg {
    margin: 0 6px;
  }
`;

const AnimationControls = ({
  isAnimatable,
  isAnimating,
  pauseAnimation,
  resetAnimation,
  startAnimation
}) => (
  <StyledAnimationControls
    className={classnames('time-range-slider__control', {disabled: !isAnimatable})}
  >
    <ButtonGroup>
      <IconButton className="playback-control-button"
        onClick={resetAnimation} secondary>
        <Reset height="12px"/>
      </IconButton>
      <IconButton className={classnames('playback-control-button', {active: isAnimating})}
        onClick={isAnimating ? pauseAnimation : startAnimation} secondary>
        {isAnimating ? <Pause height="12px"/> : <Play height="12px"/>}
      </IconButton>
    </ButtonGroup>
  </StyledAnimationControls>
);
