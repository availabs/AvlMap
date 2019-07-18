import React from "react"

import styled from "styled-components"
import get from "lodash.get"

import { range } from "d3-array";
import { format } from "d3-format"

import { Input } from "components/common/styled-components"
import ItemSelector from 'components/common/item-selector/item-selector';

export default class AvlTable extends React.Component {
	static defaultProps = {
		data: [],
		keys: [],
		rowsPerPage: 10,
		pageSpread: 2
	}

	state = {
		page: 0,
		searchKey: null,
		searchString: "",
		sortKey: null,
		sortDirection: 1
	}

	setPage(page) {
		const maxPage = Math.floor(this.props.data.length / this.props.rowsPerPage);
		this.setState({ page: Math.max(0, Math.min(maxPage, page)) });
	}
	prevPage() {
		this.setState({ page: Math.max(0, this.state.page - 1) });
	}
	nextPage() {
		const maxPage = Math.floor(this.props.data.length / this.props.rowsPerPage);
		this.setState({ page: Math.min(maxPage, this.state.page + 1) });
	}

	setSearchKey(searchKey = null) {
		const newState = { searchKey };
		if (searchKey !== this.state.searchKey) {
			newState.searchString = "";
		}
		this.setState(newState);
	}
	setSearchString(searchString) {
		this.setState({ searchString });
	}
	setSortKey(sortKey = null) {
		let sortDirection = 1;
		if (sortKey === this.state.sortKey) {
			sortDirection = this.state.sortDirection * -1;
		}
		this.setState({ sortKey, sortDirection });
	}

	getKeys() {
		let { keys, data } = this.props;
		if (!keys.length && data.length) {
			keys = Object.keys(data[0]);
		}
		return keys;
	}

	getData() {
		let { data } = this.props;

		const searchKey = this.state.searchKey,
			searchString = this.state.searchString.toLowerCase();
		if ((searchKey !== null) && Boolean(searchString)) {
			if ((searchString[0] === "!") && (searchString.length > 1)) {
				data = data.filter(d => !get(d, [searchKey], "").toString().toLowerCase().includes(searchString.slice(1)));
			}
			else if (searchString[0] !== "!") {
				data = data.filter(d => get(d, [searchKey], "").toString().toLowerCase().includes(searchString));
			}
		}

		const isN = n => !isNaN(+n);

		const {
			sortKey,
			sortDirection
		} = this.state;
		if (sortKey !== null) {
			data.sort((a, b) => {
				a = get(a, [sortKey], false);
				b = get(b, [sortKey], false);

				if (!a) return 1;
				if (!b) return -1;

				if (isN(a) && isN(b)) {
					return (a - b) * sortDirection;
				}
				a = a.toString().toLowerCase();
				b = b.toString().toLowerCase();

				return (a < b ? -1 : b < a ? 1 : 0) * sortDirection;
			})
		}
		return [this.getKeys(), data];
	}

	render() {
		let [keys, data] = this.getData();

		let { page, searchKey, searchString, sortKey, sortDirection } = this.state;

		const { rowsPerPage, pageSpread } = this.props,
			maxPage = Math.floor(data.length / rowsPerPage),
			length = data.length;

		page = Math.min(maxPage, page);

		data = data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
		return (
			<div ref={ this.container }>

				<NavigationBar page={ page }
					maxPage={ maxPage }
					length={ length }
					rowsPerPage={ rowsPerPage }
					pageSpread={ pageSpread }
					prevPage={ () => this.prevPage() }
					nextPage={ () => this.nextPage() }
					setPage={ p => this.setPage(p) }
					searchKeys={ keys }
					searchKey={ searchKey }
					setSearchKey={ key => this.setSearchKey(key) }
					searchString={ searchString }
					setSearchString={ str => this.setSearchString(str) }/>

				<table>
					<thead>
						<tr>
							{
								keys.map(key =>
									<TH key={ key } onClick={ () => this.setSortKey(key) }
										className={ key === sortKey ? "active" : "" }>
										{ key.replace("_", " ") }
										{ key !== sortKey ? null :
											<span className="fa fa-lg fa-caret-down ml-1"
												style={ { transform: `rotate(${ sortDirection === 1 ? 180 : 0 }deg)` } }/>
										}
									</TH>
								)
							}
						</tr>
					</thead>
					<tbody>
						{
							data.map((row, i) =>
								<tr key={ i }>
									{ keys.map(key => <td key={ key }>{ row[key] }</td>) }
								</tr>
							)
						}
					</tbody>
				</table>

			</div>
		)
	}
}
const TH = styled.th`
	padding-top: 2px;
	cursor: pointer;
	:hover {
		text-decoration: underline;
	}
	&.active {
		text-decoration: underline;
	}
`

const Button = styled.button`
	background-color: rgb(50, 50, 70);
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

const _NavigationBar = styled.div`
	display: flex;
	flex-direction: column;
	width: 100%;

	> * {
		width: 100%;
		position: relative;

		::after {
			content: "";
			clear: both;
			display: table;
		}

		> * {
			display: inline-block;

			:last-child {
				float: right;
			}
			&.middle {
				width: 100%;
				position: absolute;
				top: 0px;
				left: 0px;
				display: flex;
				justify-content: center;
				pointer-events: none;
				> * {
					pointer-events: all;
				}
			}
			:first-child {
				float: left;
			}
		}
	}
`
const getPageSpread = (page, maxPage, pageSpread) => {
	let low = page - pageSpread,
		high = page + pageSpread;

	if (low < 0) {
		high += -low;
		low = 0;
	}
	if (high > maxPage) {
		low -= (high - maxPage);
		high = maxPage;
	}
	return range(Math.max(0, low), Math.min(maxPage, high) + 1);
}
const numberFormat = format(",d");

const NavigationBar = ({ prevPage,
													nextPage,
													page,
													maxPage,
													setPage,
													length,
													searchKeys,
													searchKey,
												 	setSearchKey,
													setSearchString,
													searchString,
													rowsPerPage,
													pageSpread
												}) =>
	<_NavigationBar>

		<div>
			Search Table
		</div>

		<div>
			<div style={ { display: "flex", flexDirection: "row", width: "50%", display: "inline-block" } }>
				<ItemSelector
					placeholder="Select a search key..."
					selectedItems={ searchKey }
					multiSelect={ false }
					searchable={ false }
					displayOption={ d => d }
					getOptionValue={ d => d }
					onChange={ setSearchKey }
					options={ searchKeys }/>
			</div>
			<div style={ { width: "50%", display: "inline-block" } }>
				<Input type="text" value={ searchString }
					disabled={ !Boolean(searchKey) }
					onChange={ ({ target: { value } }) => setSearchString(value) }
					placeholder="search..."/>
			</div>
		</div>

		<div>
			<div>Displaying: { numberFormat(Math.min(page * rowsPerPage + 1, length)) } - { numberFormat(Math.min(page * rowsPerPage + rowsPerPage, length)) } of { numberFormat(length) }</div>
			<div>Page: { numberFormat(page + 1) } of { numberFormat(maxPage + 1) }</div>
		</div>

		<div>
			<div>
				<Button onClick={ () => setPage(0) }
					disabled={ page === 0 }>
					<span className="fa fa-chevron-left"/>
					<span className="fa fa-chevron-left"/>
				</Button>
				<Button onClick={ prevPage }
					disabled={ page === 0 }>
					<span className="fa fa-chevron-left"/>
				</Button>
			</div>
			<div className="middle">
				{
					getPageSpread(page, maxPage, pageSpread)
						.map(p =>
							<Button key={ p }
								disabled={ p === page }
								className={ p === page ? "active" : "" }
								onClick={ () => setPage(p) }>
								{ numberFormat(p + 1) }
							</Button>
						)
				}
			</div>
			<div>
				<Button onClick={ nextPage }
					disabled={ page === maxPage }>
					<span className="fa fa-chevron-right"/>
				</Button>
				<Button onClick={ () => setPage(maxPage) }
					disabled={ page === maxPage }>
					<span className="fa fa-chevron-right"/>
					<span className="fa fa-chevron-right"/>
				</Button>
			</div>
		</div>

	</_NavigationBar>
