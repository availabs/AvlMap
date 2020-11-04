import React from "react"

import Accessor from './accessor';
import { _toArray } from "./item-selector"
import { classList } from "./dropdown-list"

import classNames from "classnames"
import deepequal from "deep-equal"
import styled from "styled-components"

const defaultDisplay = d => d;

const GroupItemWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background-color: ${ props => props.theme.dropdownListBgd };
  padding-left: 8px;
  :focus {
    outline: 0;
  }
`
const GroupItem = ({ value, displayOption = defaultDisplay }) => (
  <div className={ classList.listItemAnchor }
    style={ { flexGrow: 1 } }>
    { displayOption(value) }
  </div>
);

const DropdownListWrapper = styled.div`
  background-color: ${ props => props.theme.dropdownListBgd };
  border-top: 1px solid ${ props => props.theme.dropdownListBorderTop };
  ${ props => props.theme.dropdownList };
`;
const DropdownListInner = styled.div`
  box-shadow: 0 6px 12px 0 rgba(0, 0, 0, 0.5);
`

const DropdownList = ({ options, onOptionSelected, getOptionValue, displayOption, selectedItems }) =>
  <DropdownListInner>
    { options.map((option, i) => (
        <div key={ `${displayOption(option)}_${i}` }
          onClick={ e => onOptionSelected(option, e) }
          className={ classNames(classList.listItem, {
            hover: selectedItems.reduce((a, c) => a || deepequal(getOptionValue(c), getOptionValue(option)), false)
          }) }>
          <ListItem value={ option } displayOption={ displayOption }/>
        </div>
      ))
    }
  </DropdownListInner>

export const ListItem = ({ value, displayOption = defaultDisplay }) => (
  <span className={ classList.listItemAnchor }>{ displayOption(value) }</span>
);

export default class GroupItems extends React.Component {

  _renderGroup(group) {
    return (
      <GroupItemWrapper>
        <DropdownList options={ group.options }
          onOptionSelected={ this.props.onOptionSelected }
          getOptionValue={ this.props.getOptionValue }
          displayOption={ this.props.displayOption }
          selectedItems={ this.props.selectedItems }/>
      </GroupItemWrapper>
    );
  }

  render() {
    const { openedGroup } = this.props;
    return (
      <DropdownListWrapper>
        { this.props.options.map(group =>
            <div key={ group.name }>
              <div className={ classList.listItem }
                style={ {
                  paddingRight: "0px", display: "flex", alignItems: "center",
                  borderBottom: openedGroup === group.name ? "2px solid currentColor" : "none",
                } }
                onClick={ e => this.props.toggleGroup(group) }>
                <GroupItem value={ group.name }/>
                <span style={ { marginRight: "8px" } } className="fa fa-caret-down"/>
              </div>
              { openedGroup !== group.name ? null :
                this._renderGroup(group)
              }
            </div>
          )
        }
      </DropdownListWrapper>
    )
  }
}
