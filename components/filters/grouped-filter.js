import React from 'react';
import GroupedSelector from '../common/item-selector/grouped-selector';
import {PanelLabel, SidePanelSection} from '../common/styled-components';

const GroupedSelectFilter = ({ filter, setFilter, multi = false }) => (
  <SidePanelSection >
    <PanelLabel>{filter.name}</PanelLabel>
    <GroupedSelector
      selectedItems={ filter.value }
      // placeholder={"Select a Value"}
      options={ filter.groups }
      multiSelect={ multi }
      searchable={ false }
      displayOption={ d => d.name ? d.name : filter.domain.reduce((a, c) => c.value === d ? c.name : a, d) }
      getOptionValue={ d => d.value ? d.value : d }
      onChange={ setFilter }
      inputTheme="secondary"
    />
  </SidePanelSection>
)


export default GroupedSelectFilter;
