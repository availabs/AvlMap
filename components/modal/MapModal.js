import React from 'react';
// import { connect } from 'react-redux';

import { Close } from "components/common/icons"

import { Tooltip } from 'components/common/styled-components';

import styled from 'styled-components';

// import { toggleModal } from "pages/MapView/store/MapStore"

const ModalContainer = styled.div`
	color: ${ props => props.theme.textColor };
	position: fixed;
	width: 100%;
	bottom: ${ props => props.position === "bottom" ? "20px" : "auto" };
	top: ${ props => props.position === "top" ? "20px" : "auto" };
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
	z-index: 500;
`

const ModalWrapper = styled.div`
	${ props => props.theme.scrollBar };
	background-color: ${ props => props.theme.panelBackground };
	display: inline-flex;
	position: relative;
	pointer-events: all;
	padding: 20px;
	overflow: auto;
`

const CloseWrapper = styled.div`
	display: inline-block;
	color: ${ props => props.theme.textColor };
	position: absolute;
	right: 10px;
	top: 10px;
	cursor: pointer;
	padding: 0px 4px 0px 4px;
	border-radius: 4px;

	:hover {
		color: ${ props => props.theme.textColorHl };
		background-color: #666;
	}
`

class MapModal extends React.Component {
	render() {
		const modal = this.props.layers.reduce((a, layer) => {
			let m = null;
			if (layer.modals) {
				for (const key in layer.modals) {
					if (layer.modals[key].show) {
						m = {
							...layer.modals[key],
							layerName: layer.name,
							modalName: key,
							props: layer.modals[key].props || {},
							layer
						}
					}
				}
			}
			return m || a;
		}, {});

		const { position = "bottom" } = modal;

		return !modal.comp ? null : (
			<ModalContainer position={ position }>
				<ModalWrapper>
					<CloseWrapper onClick={ e => { e.preventDefault(); e.stopPropagation(); this.props.toggleModal(modal.layerName, modal.modalName); } }>
						<span className="fa fa-2x fa-close" data-tip data-for="close-modal-btn"/>
	          <Tooltip
	            id="close-modal-btn"
	            effect="solid"
	            delayShow={ 500 }>
	            <span>Close Modal</span>
	          </Tooltip>
					</CloseWrapper>
					<modal.comp { ...modal.props }
						theme={ this.props.theme }
						layer={ modal.layer }/>
				</ModalWrapper>
			</ModalContainer>
		)
	}
}

export default MapModal
