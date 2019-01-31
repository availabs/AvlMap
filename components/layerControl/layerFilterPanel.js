import React, {Component} from 'react';
import styled from 'styled-components';
import { Button, StyledPanelHeader} from 'components/common/styled-components';

//import * as Filters from 'components/filters';
import {SingleSelectFilter,MultiSelectFilter, DateFilter} from 'components/filters'
import TimeRangeSldier from "../time-range-slider/time-range-slider"
// import deepEqual from 'deep-equal'

const sliderStyle =  {
    width: '100%',
    height: 24,
    background: '#29323C',
    outline: 'none',
    opacity: '0.7',
    // WebkitTransition: 'opacity .15s ease-in-out',
    transition: 'opacity .15s ease-in-out'
}

const StyledFilterPanel = styled.div`
  margin-bottom: 12px;
  border-radius: 1px;
  .filter-panel__filter {
    margin-top: 24px;
  }
`;

// const StyledFilterHeader = StyledPanelHeader.extend`
//   cursor: pointer;
//   padding: 10px 12px;
// `;

const SubmitButton = Button.extend`
  width: 100%
`

const StyledFilterContent = styled.div`
  background-color: ${props => props.theme.panelBackground};
  padding: 12px;
`;

const TimeRangeSliderContainer = styled.div`
  background-color: ${ props => props.theme.panelBackground };
  padding: 20px;
  z-index: 1000;
  position: fixed;
  bottom: 30px;
  right: 50px;
  width: 750px;
`

 class LayerFilterPanel extends Component {
  

  render() {
    
    const { layer } = this.props,
      filters = layer.filters;

    const renderFilter = (filterName, i) => {
      const filter = filters[filterName];

      const dispatchUpdateFilter = (value) => {
        this.props.updateFilter(layer.name, filterName, value)  
      }

      const dispatchUpdateSlider = (e) => {
        this.props.updateFilter(layer.name, filterName, e.target.value)  
      }


      // const dispatchSubmit = () => {
      //   this.props.fetchLayerData(layer.name)
      // }

      const getFilter = (filter) => {
        switch(filter.type) {
          case 'dropdown':
            return <SingleSelectFilter 
              setFilter={ dispatchUpdateFilter } 
              filter={ filter }
            />;
          case 'multi':
            return <MultiSelectFilter 
              setFilter={ dispatchUpdateFilter } 
              filter={ filter }
            />;
          case 'fetch':
            return (
              <SubmitButton onClick={ dispatchUpdateFilter }>
                {filter.name}
              </SubmitButton>
            );
          case 'slider':
            return (
              <div>

              {filter.name} - {filter.value}
                <input type="range" 
                  min={filter.min || 0} 
                  max={filter.max || 100} 
                  value={filter.value} 
                  style={sliderStyle} 
                  onChange={dispatchUpdateSlider} 
                />
              </div>
            );
          case 'date':
            return (
              <DateFilter 
              setFilter={ dispatchUpdateFilter } 
              filter={ filter }
              />
            );
          case "time-range":
            return (
              <TimeRangeSliderContainer>
                <TimeRangeSldier
                  onChange={ dispatchUpdateFilter }
                  histogram={ filter.histogram }
                  domain={ filter.domain }
                  value={ filter.value }
                  step={ filter.step }
                  toggleAnimation={ () => console.log("toggleAnimation") }
                  isEnlarged={ true }
                  isAnimatable={ true }
                  speed={ filter.speed || 1 }
                  hideTitle={ filter.hideTitle }
                  Title={ filter.Title }/>
              </TimeRangeSliderContainer>
            );
        }
      }

      return (
        <div key={ i }>
          {getFilter(filter)}
        </div>
      )
    }

    return (
      <StyledFilterPanel className="filter-panel">
         <StyledFilterContent className="filter-panel__content">
          { Object.keys(filters).map(renderFilter) }
         </StyledFilterContent>
      </StyledFilterPanel>
    );
  }
}

export default LayerFilterPanel