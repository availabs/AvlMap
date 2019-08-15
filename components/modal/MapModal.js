import React from 'react';

import { VertDots } from "components/common/icons"

import { Tooltip } from 'components/common/styled-components';

import styled from 'styled-components';

import DraggableModal from "components/AvlStuff/DraggableModal"

const ModalWrapper = styled.div`
	${ props => props.theme.scrollBar };
	background-color: ${ props => props.theme.panelBackground };
	display: inline-flex;
	position: relative;
	pointer-events: all;
	padding: 20px;
	/*overflow: auto;*/
	width: 100%;
	height: 100%;
`

class MapModal extends React.Component {
	MODAL_ID = undefined
	close(e, { layerName, modalName }) {
		e.preventDefault();
		e.stopPropagation();
		this.props.toggleModal(layerName, modalName);
	}
	render() {
		const modal = this.props.layers.reduce((a, layer) => {
			let m = null;
			if (layer.modals) {
				for (const key in layer.modals) {
					if (layer.modals[key].show) {
						m = {
							...layer.modals[key],
							id: `${ layer.name }-${ key }`,
							layerName: layer.name,
							modalName: key,
							props: layer.modals[key].props || {},
							layer,
							startSize: layer.modals[key].startSize || [800, 500],
							startPos: layer.modals[key].position || "bottom"
						}
					}
				}
			}
			return m || a;
		}, {});

		Boolean(modal.comp) && (this.MODAL_ID = modal.id)

		return (
			<DraggableModal show={ Boolean(modal.comp) }
				onClose={ e => this.close(e, modal) }
				meta={ { id: this.MODAL_ID, startSize: modal.startSize, startPos: modal.startPos } }
				resizeOnIdChange={ true }>
				<ModalWrapper>
					{ !Boolean(modal.comp) ? null :
						<modal.comp { ...modal.props }
							theme={ this.props.theme }
							layer={ modal.layer }/>
					}
				</ModalWrapper>
			</DraggableModal>
		)
	}
}

export default MapModal
