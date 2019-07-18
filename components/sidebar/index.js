import React, {Component} from 'react';
// import { connect } from 'react-redux';

import styled from "styled-components"
// import deepEqual from 'deep-equal'
import SidebarContainer from './sidebar'
import SidebarHeader from './SidebarHeader'
import LayerSelector from './LayerSelector'
import ActiveLayers from './ActiveLayers'

import { Layers, Crosshairs } from "components/common/icons"

import deepequal from "deep-equal"

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
    activePage: this.props.pages[0]
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
          Icon: () => (
            <div className={ this.state.activePage === page ? "active" : "" }
              onClick={ () => this.setActivePage(page) }>
              <Layers width="30px" height="30px"/>
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
              onClick={ () => this.setActivePage(page) }>
              <span className="fa fa-2x fa-map"/>
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
          <div className={ this.state.activePage === page ? "active" : "" }
            onClick={ () => this.setActivePage(page) }>
            <page.Icon />
          </div>
        ),
        Comp: () => <page.Comp layers={ this.props.layers }/>
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
  onSelect(e, value) {
    e.stopPropagation();
    if (!this.state.open) {
      return this.toggleAccordion();
    }
    this.props.onSelect(value);
    this.toggleAccordion();
  }
  toggleAccordion() {
    const open = !this.state.open;
    this.setState({ transitioning: true, open });
    setTimeout(() => this.setState({ transitioning: false }), 500);
  }
  render() {
    const { open, transitioning } = this.state;
    let { options, value } = this.props;
    const option = options.reduce((a, c, i) => i === value ? c : a);
    options = options.filter((d, i) => open || transitioning || (value === i));
console.log(open, transitioning, options);
    return (
      <AccordionContainer
        style={ { height: `${ open ? options.length * 40 + (options.length - 1) * 10 + PADDING * 2 : 40 + PADDING * 2 }px` } }>
        {
          options
            .map(({ label, icon }, i) =>
              <AccordionOption key={ i }
                style={ {
                  top: `${ open ? i * 50 + PADDING : PADDING }px`,
                  zIndex: label === option.label ? 10 : 5
                } }
                onClick={ e => this.onSelect(e, i) }
                top={ i * 50 + PADDING }>
                <div className="icon">ICON</div>
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
  background-color: #666;
`
const AccordionOption = styled.div`
  color: ${ props => props.theme.textColor };
  position: absolute;
  left: ${ PADDING }px;
  transition: top 0.5s;
  height: 40px;
  background-color: #444;
  width: calc(100% - ${ PADDING * 2 }px);
  display: flex;
  flex-direction: row;
  > * {
    :first-child {
      width: 40px;
      height: 40px;
      background-color: #ccc;
    }
    :last-child {
      width: calc(100% - 40px);
      background-color: #090;
    }
  }

  @keyframes onEnter {
    from { top: ${ PADDING }px; }
    to { top: ${ props => props.top }px; }
  }
  animation: onEnter 0.5s;
`
