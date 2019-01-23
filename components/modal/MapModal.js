import React, {Component} from 'react';
import { connect } from 'react-redux';

import { Close } from "components/common/icons"

import { Tooltip } from 'components/common/styled-components';

import styled from 'styled-components';

// import { toggleModal } from "pages/MapView/store/MapStore"

const ModalContainer = styled.div`
	position: fixed;
	width: 100%;
	bottom: 30px;
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
		const layers = this.props.layers,
			modal = layers.reduce((a, c) => c.modal && c.modal.show ? { comp: c.modal.comp, layerName: c.name } : a, null);
		return !modal ? null : (
			<ModalContainer>
				<ModalWrapper>
					<CloseWrapper onClick={ e => { e.preventDefault(); e.stopPropagation(); this.props.toggleModal(modal.layerName); } }>
						<Close data-tip data-for="close-modal-btn"/>
	          <Tooltip
	            id="close-modal-btn"
	            effect="solid"
	            delayShow={ 500 }>
	            <span>Close Modal</span>
	          </Tooltip>
					</CloseWrapper>
					<modal.comp />
				</ModalWrapper>
			</ModalContainer>
		)
	}
}

export default MapModal