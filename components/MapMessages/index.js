import React from "react"

import styled from "styled-components"

import classnames from "classnames"

import deepequal from "deep-equal"

const MessageContainer = styled.div`
	position: fixed;
	width: 100vw;
	height: 100vh;
	z-index: 50;
	text-align: center;
	pointer-events: none;

	> * {
		transition: top 0.5s;
	}
`
const MessageStyled = styled.div`
	pointer-events: all;
	position: absolute;
	min-width: 400px;
	display: inline-block;
	padding: 10px 40px 10px 10px;
	color: ${ props => props.theme.textColor };
	background-color: ${ props => props.theme.sidePanelBg };
	text-align: left;
	border-radius: 4px;

	&.confirm {
		padding-right: 10px;

		.confirm-buttons-div {
			margin-top: 5px;
			button:first-child {
				float: left;
			}
			button:last-child {
				float: right;
			}
		}
		.confirm-buttons-div::after {
			content: "";
			clear: both;
			display: table;
		}
	}

	@keyframes entering {
		from {
			top: -${ props => props.height }px;
			transform: scale(0.25, 0.25);
		}
		to {
			top: ${ props => props.top }px;
			transform: scale(1, 1);
		}
	}
	&.entering {
		transition: top 1.0s;
		animation: entering 1.0s;
	}

	@keyframes dismissing {
		from {
			top: ${ props => props.top }px;
			transform: scale(1, 1);
		}
		to {
			top: -${ props => props.height }px;
			transform: scale(0.25, 0.25);
		}
	}
	&.dismissing {
		transition: top 1.0s;
		animation: dismissing 1.0s;
	}
`
const DismissButton = styled.div`
	position: absolute;
	top: 7px;
	right: 7px;
	padding: 5px;
	width: 26px;
	height: 26px;
	display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
	color: ${ props => props.theme.textColor };
	background-color: ${ props => props.theme.sidePanelBg };
  transition: background-color 0.15s, color 0.15s;

  :hover {
  	background-color: ${ props => props.theme.textColor };
  	color: ${ props => props.theme.sidePanelBg };
  }
`

class MapMessages extends React.Component {
	static defaultProps = {
		messages: []
	}
	state = {
		dismissing: new Map(),
		timeouts: new Map(),
		heights: new Map()
	}
	componentDidUpdate(oldProps) {
		if (this.props.messages.length > oldProps.messages.length) {
			const length = this.props.messages.length,
				message = this.props.messages[length - 1],
				timeouts = new Map(this.state.timeouts);
			if (message.duration) {
				timeouts.set(
					message.id,
					setTimeout(() => this.readyDismiss(message.id), message.duration)
				);
				this.setState({ timeouts });
			}
		}
		else if ((this.props.messages.length === oldProps.messages.length) &&
							!deepequal(
								oldProps.messages.map(({ id, update }) => ({ id, update})),
								this.props.messages.map(({ id, update }) => ({ id, update}))
							)) {
			this.props.messages.forEach(({ update, id, duration }) => {
				const old = oldProps.messages.find(m => m.id === id);
				if ((old.update !== update) && duration) {
					const timeouts = new Map(this.state.timeouts);
					clearTimeout(timeouts.get(id));
					timeouts.set(
						id,
						setTimeout(() => this.readyDismiss(id), duration)
					)
					this.setState({ timeouts });
					if (this.state.dismissing.has(id)) {
						clearTimeout(this.state.dismissing.get(id));
						this.state.dismissing.delete(id);
					}
				}
			})
		}
	}
	readyDismiss(id) {
		const i = this.props.messages.findIndex(m => m.id === id);
		this.dismiss(id, i);
	}
	dismiss(id, i) {
		clearTimeout(this.state.timeouts.get(id));
		this.state.timeouts.delete(id);

		const message = this.props.messages.find(m => m.id === id);

		this.props.dismiss(id);

		this.state.heights.delete(id);

		id = `${ id }-${ Date.now() }`;

		const dismissing = new Map(
			[...this.state.dismissing,
				[id, { timeout: setTimeout(() => this.clear(id), 1000), message: { ...message, id }, i }]
			]
		);
		this.setState({ dismissing });
	}
	clear(id) {
		const dismissing = this.state.dismissing;
		dismissing.delete(id);
		this.setState({ dismissing: new Map(dismissing) });
	}
	reportHeight(id, height) {
		const heights = new Map([...this.state.heights, [id, height]]);
		this.setState({ heights });
	}
	getHeight(id) {
		const map = this.state.heights;
		return map.has(id) ? map.get(id) : 0;
	}
	render() {
		const {
			dismissing
		} = this.state;
		const {
			messages
		} = this.props;
		let Messages = [...messages];
		dismissing.forEach((data, id) => {
			Messages.splice(data.i, 0, data.message);
		})

		let current = 0;
		const getTop = (id, dismissing) => {
			const height = this.getHeight(id),
				top = current + 10;
			if (!dismissing) current += height + 10;
			return top;
		}
		return (
			<MessageContainer>
				{
					Messages.map(({ id, ...rest }, i) =>
						<MessageFactory key={ id }
							id={ id } { ...rest }
							dismissing={ dismissing.has(id) }
							dismiss={ id => this.readyDismiss(id) }
							zIndex={ messages.length - i - (dismissing ? - messages.length : 0)}
							reportHeight={ this.reportHeight.bind(this) }
							height={ this.getHeight(id) }
							top={ getTop(id, dismissing.has(id)) }/>
					)
				}
			</MessageContainer>
		)
	}
}
export default MapMessages

const MessageFactory = ({ ...props }) =>
	props.onConfirm ? <ConfirmMessage { ...props }/> : <Message { ...props }/>
// //
class Message extends React.Component {
	comp = null;
	timeout = null;
	state = {
		left: 0,
		width: 0,
		entering: !this.props.dismissing
	}
	componentDidMount() {
		this.checkWidth();
		this.timeout = setTimeout(() => this.setState({ entering: false }), 1000);
	}
	componentWillUnmount() {
		clearTimeout(this.timeout);
	}
	componentDidUpdate() {
		this.checkWidth();
	}
	checkWidth() {
		const comp = this.comp;
		if (!comp) return;
		const width = comp.scrollWidth,
			height = comp.scrollHeight;
		if (width !== this.state.width) {
			this.setState({ left: width * 0.5, width });
		}
		if (height !== this.props.height) {
			this.props.reportHeight(this.props.id, height);
		}
	}
	renderMessage() {
		const {
			Message,
			dismiss,
			layer,
			id
		} = this.props;
		return (
			<>
				{ typeof Message === "function" ? <Message layer={ layer }/> : Message }
				<DismissButton onClick={ () => dismiss(id) }>
					<span className="fa fa-lg fa-close"/>
				</DismissButton>
			</>
		)
	}
// //
	render() {
		const {
			dismissing,
			zIndex,
			height,
			top,
			onConfirm
		} = this.props;
		const { entering } = this.state,
			confirm = Boolean(onConfirm);

		return (
			<MessageStyled
				className={ classnames({ dismissing, entering, confirm }) }
				innerRef={ comp => this.comp = comp }
				height={ height }
				style={ {
					top: `${ top }px`,
					left: `calc(50% - ${ this.state.left }px)`,
					zIndex
				} }>
				{ this.renderMessage() }
			</MessageStyled>
		)
	}
}
// //
class ConfirmMessage extends Message {
	renderMessage() {
		const {
			Message,
			dismiss,
			onConfirm,
			layer,
			id
		} = this.props;

		return (
			<>
				{ typeof Message === "function" ? <Message layer={ layer }/> : Message }
				<div className="confirm-buttons-div">
					<button className="btn btn-sm btn-outline-danger"
						onClick={ () => dismiss(id) }>
						Dismiss
					</button>
					<button className="btn btn-sm btn-outline-success"
						onClick={ () => (dismiss(id), onConfirm()) }>
						Confirm
					</button>
				</div>
			</>
		)
	}
}