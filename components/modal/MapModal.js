import React from 'react';
// import { connect } from 'react-redux';

import { Close } from "components/common/icons"

import { Tooltip } from 'components/common/styled-components';

import styled from 'styled-components';

// import { toggleModal } from "pages/MapView/store/MapStore"

const ModalContainer = styled.div`
	position: fixed;
	width: 100%;
	bottom: ${ props => props.position === "bottom" ? "30px" : "auto" };
	top: ${ props => props.position === "top" ? "20px" : "auto" };
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
`

const ModalWrapper = styled.div`
	background-color: ${ props => props.theme.panelBackground };
	display: inline-flex;
	position: relative;
	pointer-events: all;
	padding: 20px;
`

const CloseWrapper = styled.div`
	display: inline-block;
	color: ${ props => props.theme.textColor };
	position: absolute;
	right: 5px;
	top: 5px;
	cursor: pointer;
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
		const { position="bottom" } = modal;
		return !modal.comp ? null : (
			<ModalContainer position={ position }>
				<ModalWrapper>
					<CloseWrapper onClick={ e => { e.preventDefault(); e.stopPropagation(); this.props.toggleModal(modal.layerName, modal.modalName); } }>
						<Close data-tip data-for="close-modal-btn"/>
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