import React, {Component} from 'react';

import SidebarContainer from './sidebar'
import SidebarHeader from './SidebarHeader'
import LayerSelector from './LayerSelector'
import ActiveLayers from './ActiveLayers'

import { Layers, Crosshairs } from "components/common/icons"

import { Tooltip } from 'components/common/styled-components';

import deepequal from "deep-equal"
import styled from "styled-components"
import classnames from "classnames"
import get from "lodash.get"

const SidebarContent = styled.div`
  ${ props => props.theme.scrollBar };
  flex-grow: 1;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
`

const Pages = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  padding: 0px 10px 10px 10px;
  color: ${ props => props.theme.textColor };

  > * {
    padding: 5px;
    cursor: pointer;
    height: 40px;
    width: 40px;
    display: flex;
    justify-content: center;
    align-items: center;

    :hover {
      color: ${ props => props.theme.textColorHl };
      background-color: #666;
    }
    &.active {
      color: ${ props => props.theme.textColorHl };
      padding-bottom: 3px;
      border-bottom: 2px solid ${ props => props.theme.textColorHl };
    }
  }
`

class Sidebar extends Component {
  state = {
    pages: [],
    activePage: get(this.props, "pages[0].page", this.props.pages[0])
  }
  componentDidMount() {
    this.setState({ pages: this.expandPages() });
  }
  componentDidUpdate(oldProps) {
    if (!deepequal(oldProps.pages, this.props.pages)) {
      this.setState({ pages: this.expandPages() });
    }
  }

  setActivePage(activePage) {
    this.setState({ activePage });
  }
  expandPages() {
    return this.props.pages.map(page => {
      if (page === "layers") {
        return {
          page,
          tooltip: "Layer Controls",
          Icon: () => (
            <div className={ this.state.activePage === page ? "active" : "" }
              onClick={ () => this.setActivePage(page) }
              data-tip data-for="layers-tooltip">
              <Layers width="30px" height="30px"/>
              <Tooltip
                place="bottom"
  	            id="layers-tooltip"
  	            effect="solid"
  	            delayShow={ 500 }>
  	            <span>Layer Controls</span>
  	          </Tooltip>
            </div>
          ),
          Comp: () => (
            <>
              { !this.props.layers.reduce((a, c) => a || !c.active, false) ? null :
                <LayerSelector { ...this.props }/>
              }
              <ActiveLayers { ...this.props }/>
            </>
          )
        }
      }
      if (page === "basemaps") {
        return {
          page,
          Icon: () => (
            <div className={ this.state.activePage === page ? "active" : "" }
              onClick={ () => this.setActivePage(page) }
              data-tip data-for="basemap-tooltip">
              <span className="fa fa-2x fa-map"/>
              <Tooltip
                place="bottom"
  	            id="basemap-tooltip"
  	            effect="solid"
  	            delayShow={ 500 }>
  	            <span>Basemap Selector</span>
  	          </Tooltip>
            </div>
          ),
          Comp: () => (
            <BaseMapsSelector style={ this.props.style }
              setMapStyle={ this.props.setMapStyle }
              styles={ this.props.mapStyles }/>
          )
        }
      }
      return {
        ...page,
        Icon: () => (
          <div className={ this.state.activePage === page.page ? "active" : "" }
            onClick={ () => this.setActivePage(page.page) }
            data-tip data-for={ `tooltip-${ page.page }` }>
            <page.Icon />
            <Tooltip
              place="bottom"
              id={ `tooltip-${ page.page }` }
              effect="solid"
              delayShow={ 500 }>
              { page.tooltip }
            </Tooltip>
          </div>
        ),
        Comp: () => (
          <page.Comp map={ this.props.map }
            layers={ this.props.layers }/>
        )
      };
    })
  }
  render() {
    let sidebarContentStyle = {
      flexGrow: 1,
      padding: 0,
      overflowY: 'auto',
      overflowX: 'hidden'
    }

    const { pages } = this.state;

    return (
      <SidebarContainer isOpen={ this.props.isOpen }
        transitioning={ this.props.transitioning }
        onOpenOrClose={ this.props.onOpenOrClose }
        onTransitionStart={ this.props.onTransitionStart }>

        <SidebarHeader header={ this.props.header }/>

        <Pages>
          {
            pages.map(({ page, Icon }) => <Icon key={ page }/>)
          }
        </Pages>

        <SidebarContent className='sidebar-content' theme={ this.props.theme }>

          {
            pages.map(({ page, Comp }, i) =>
              <div key={ i }
                style={ { display: page === this.state.activePage ? "block" : "none" } }>
                <Comp />
              </div>
            )
          }

        </SidebarContent>

      </SidebarContainer>
    );
  }
}

export default Sidebar

class BaseMapsSelector extends React.Component {
  onSelect(index) {
    const style = this.props.styles.reduce((a, c, i) => i === index ? c : a);
    this.props.setMapStyle(style);
  }
  render() {
    const { styles, style, setMapStyle } = this.props,
      value = styles.reduce((a, c, i) => c.name === style.name ? i : a, 0);
    return (
      <div>
        <AccordionSelector value={ value }
          options={ styles.map(({ style, name }) => ({ label: name })) }
          onSelect={ this.onSelect.bind(this) }/>
      </div>
    )
  }
}

const Button = styled.button`
	background-color: rgb(50, 60, 70);
	color: ${ props => props.theme.textColorHl };
	border-radius: 4px;
	border: none;
	cursor: pointer;
	font-weight: 400;

	:hover {
		background-color: rgb(60, 70, 80);
	}
	:disabled {
		cursor: not-allowed;
		background-color: rgb(40, 50, 60);
		color: ${ props => props.theme.textColor };
	}

	&.active {
		background-color: ${ props => props.theme.textColor };
		color: rgb(50, 50, 70);
	}
`

const PADDING = 10;
class AccordionSelector extends React.Component {
  static defaultProps = {
    value: 0,
    options: [],
    onSelect: () => {}
  }
  state = {
    open: false,
    transitioning: false
  }
  timeout = null;
  componentsWillUnmount() {
    clearTimeout(this.timeout);
  }
  onSelect(e, value) {
    e.stopPropagation();
    if (!this.state.open) {
      return this.toggleAccordion();
    }
    if (value !== this.props.value) {
      this.props.onSelect(value);
    }
    this.toggleAccordion();
  }
  toggleAccordion() {
    const open = !this.state.open;
    this.setState({ open, transitioning: true });
    this.timeout = setTimeout(() => this.setState({ transitioning: false }), 500);
  }
  render() {
    const { open, transitioning } = this.state,
      { options, value } = this.props;
    return (
      <AccordionContainer
        style={ { height: `${ open ? options.length * 40 + (options.length - 1) * 10 + PADDING * 2 : 40 + PADDING * 2 }px` } }>
        {
          options
            .map(({ label, Icon }, i) =>
              <AccordionOption key={ i }
                className={ classnames({ open, transitioning, selected: i === value }) }
                style={ {
                  top: `${ open ? i * 50 + PADDING : PADDING }px`,
                  zIndex: i === value ? 10 : 5 - i
                } }
                onClick={ e => this.onSelect(e, i) }
                top={ i * 50 + PADDING }>
                <div>{ Boolean(Icon) ? <Icon /> : <span className="fa fa-2x fa-map"/> }</div>
                <div>{ label }</div>
              </AccordionOption>
            )
        }
      </AccordionContainer>
    )
  }
}
const AccordionContainer = styled.div`
  position: relative;
  width: 100%;
  transition: height 0.5s;
  background-color: #303336;
`
const AccordionOption = styled.div`
  background-color: ${ props => props.theme.sidePanelBg };
  color: ${ props => props.theme.textColor };
  cursor: pointer;
  position: absolute;
  left: ${ PADDING }px;
  height: 40px;
  width: calc(100% - ${ PADDING * 2 }px - 2px);
  display: flex;
  flex-direction: row;
  overflow: hidden;
  border-right: 2px solid ${ props => props.theme.sidePanelBg };
  transition: top 0.5s, color 0.15s, background-color 0.15s, border-color 0.5s;

  &.selected.open {
    border-right-color: ${ props => props.theme.textColorHl };
    color: ${ props => props.theme.textColorHl };
  }

  :hover {
    background-color: #273033;
    color: ${ props => props.theme.textColorHl };
  }

  > * {
    :first-child {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 60px;
      height: 40px;
    }
    :last-child {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      width: calc(100% - 60px);
      padding: 5px;
    }
  }
`
