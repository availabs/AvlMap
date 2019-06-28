import React from "react"

import styled from "styled-components"

import { Tooltip } from 'components/common/styled-components';

const ActionContainer = styled.div`
	position: absolute;
	top: ${ props => props.sidebar ? 50 : 20 }px;
	left: ${ props => props.sidebar ? 340 : 20 }px;
	z-index: 99;
	display: flex;
	flex-direction: column;
`
const ActionItem = styled.div`
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
`
const noop = () => {};

class MapActions extends React.Component {
	render() {
		const actions = this.props.layers.reduce((actions, layer) => {
			if (layer.active) {
				actions.push(...layer.mapActions.map(({ action=noop, ...rest }) => ({ action: action.bind(layer), ...rest })));
			}
			return actions;
		}, [])
		return (
			<ActionContainer sidebar={ this.props.sidebar }>
				{
					actions.map(({ Icon, tooltip, action }, i) =>
						<ActionItem key={ i } data-tip
            		data-for={ `action-item-${ i }` }
            		onClick={ action }>
							<Icon />
		          <Tooltip
		            id={ `action-item-${ i }` }
		            effect="solid"
		            place="right">
		            <span>{ tooltip }</span>
		          </Tooltip>
						</ActionItem>
					)
				}
			</ActionContainer>
		)
	}
}

export default MapActions