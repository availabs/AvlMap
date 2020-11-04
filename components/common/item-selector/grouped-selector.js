import React from "react"

import classnames from 'classnames';
import get from "lodash.get"
import listensToClickOutside from 'react-onclickoutside';
import styled from 'styled-components';

import Accessor from './accessor';
import ChickletedInput from './chickleted-input';
import { Delete } from 'components/common/icons';
import {
  ItemSelector,
  StyledDropdownSelect,
  DropdownSelectValue,
  DropdownSelectErase,
  DropdownWrapper,
  _toArray
} from "./item-selector"

import GroupItems from "./group-items"

class GroupedSelector extends ItemSelector {

  state = {
    showTypeahead: false,
    openedGroup: null
  };


  toggleGroup(group) {
    this.setState({
      openedGroup: group.name === this.state.openedGroup ? null : group.name
    });
  }

  _onBlur = () => {
    this.setState({ openedGroup: null });
    if (this.props.onBlur) {
      this.props.onBlur();
    }
  };

  _renderDropdown() {
    return (
      <DropdownWrapper placement={ this.props.placement }>
        <GroupItems { ...this.props } { ...this.state }
          onOptionSelected={ this._selectItem }
          toggleGroup={ group => this.toggleGroup(group) }
          displayOption={ Accessor.generateOptionToStringFor(this.props.displayOption) }
          selectedItems={ _toArray(this.props.selectedItems) }/>
      </DropdownWrapper>
    )
  }
}

export default listensToClickOutside(GroupedSelector)
