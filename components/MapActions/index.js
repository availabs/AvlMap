import React from "react"

import styled from "styled-components"

import classnames from "classnames"

import { Tooltip } from 'components/common/styled-components';

const ActionContainer = styled.div`
	position: absolute;
	top: ${ props => props.sidebar ? 50 : 20 }px;
	left: ${ props => props.sidebar && props.isOpen ? 340 : props.sidebar && !props.isOpen ? 40 : 20 }px;
	transition: left 0.25s;
	z-index: 50;
	display: flex;
	flex-direction: column;
`
const ActionItem = styled.div`
	position: relative;

	color: #ccc;
	background-color: #999;
  border: 2px solid #999;

	width: 40px;
	height: 40px;
	border-radius: 20px;

	margin-top 10px;
	:first-child {
		margin-top 0px;
	}

	display: flex;
  justify-content: center;
  align-items: center;

  cursor: pointer;

  transition: border-color 0.15s, color 0.15s, background-color 0.15s;

  :hover {
  	border: 2px solid #fff;
		color: #fff;
		background-color: #aaa;
  }
  &.disabled {
  	pointer-events: all;
  	cursor: not-allowed;
  	color: #aaa;
		background-color: #888;
		border-color: #888;
  }
  &.disabled:hover {
  	border-color: #900;
  }

	svg {
		width: 40px;
		height: 40px;
		border-radius: 20px;

		display: block;
		position: absolute;
		top: -2px;
		left: -2px;

		line {
			stroke: #900;
			stroke-width: 2px;
			transition: stroke 0.15s;
		}
		:hover line {
			stroke: #900;
		}
	}
`

const noop = () => {};

class MapActions extends React.Component {
	render() {
		const actions = this.props.layers.reduce((actions, layer) => {
			if (layer.active) {
				actions.push(
					...Object.values(layer.mapActions)
						.map(({ action=noop, disabled=false, ...rest }) =>
							({ action: action.bind(layer), layer, disabled, ...rest })
						)
				);
			}
			return actions;
		}, [])
		return (
			<ActionContainer sidebar={ this.props.sidebar } isOpen={ this.props.isOpen }>
				{
					actions.map(({ Icon, tooltip, action, disabled, layer }, i) =>
						<ActionItem key={ i } data-tip
          		data-for={ `action-item-${ i }` }
          		onClick={ disabled ? null : action }
          		className={ classnames({ disabled }) }>

							<Icon layer={ layer }/>
		          <Tooltip
		            id={ `action-item-${ i }` }
		            effect="solid"
		            place="right">
		            <span>{ tooltip }</span>
		          </Tooltip>

		          { !disabled ? null :
			          <svg>
			          	<line x1="40" x2="0" y1="0" y2="40"/>
			          </svg>
			        }

						</ActionItem>
					)
				}
			</ActionContainer>
		)
	}
}

export default MapActions