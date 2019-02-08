import React from "react"

import mapboxgl from 'mapbox-gl/dist/mapbox-gl'
import { MAPBOX_TOKEN } from 'store/config'

import Sidebar from './components/sidebar'
import Infobox from './components/infobox/Infobox'
import MapPopover from "./components/popover/MapPopover"
import MapModal from "./components/modal/MapModal"

import theme from 'components/common/themes/dark'

import './avlmap.css'

import TimeRangeSldier from "./components/time-range-slider/time-range-slider"

mapboxgl.accessToken = MAPBOX_TOKEN

let UNIQUE_ID = 0;
const getUniqueId = () =>
	`avl-map-${ ++UNIQUE_ID }`

class AvlMap extends React.Component {
	state = {
		map: null,
		activeLayers: [],
		popover: {
			pos: [0, 0],
			pinned: false,
			data: []
		},
		dragging: null,
		dragover: null
	}

  componentDidMount() {
    const {
    	id,
    	style,
    	center,
    	minZoom,
    	zoom
    } = this.props;
    const map = new mapboxgl.Map({
      container: id,
      style,
      center,
      minZoom,
      zoom
    });
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.boxZoom.disable();
    map.on('load',  () => {
      const activeLayers = [];
      this.props.layers.forEach(layer => {
      	layer.init(this);
      	if (layer.active) {
          this._addLayer(map, layer);
					layer.onAdd(map)
					activeLayers.push(layer.name);
      	}
      })
      this.setState({ map, activeLayers })
    })
  }

  getLayer(layerName) {
  	return this.props.layers.reduce((a, c) => c.name === layerName ? c : a, null);
  }

  _addLayer(map, newLayer) {
    newLayer.sources.forEach(source => {
      if (!map.getSource(source.id)) {
        map.addSource(source.id, source.source);
      }
    })

    const activeMBLayers = this.state.activeLayers.reduce((a, ln) => {
      const layer = this.props.layers.reduce((a, c) => c.name === ln ? c : a);
      return [...a, ...layer.layers];
    }, [])

    const newMBLayers = newLayer.layers.slice();
    newMBLayers.sort((a, b) => {
      const azi = a.zIndex || 0,
        bzi = b.zIndex || 0;
      return azi - bzi;
    })

    newMBLayers.forEach(mbLayer => {
      const zIndex = mbLayer.zIndex || 0;
      let layerAdded = false;
      activeMBLayers.forEach(aMBL => {
        const aMBLzIndex = aMBL.zIndex || 0;
        if (aMBLzIndex > zIndex) {
          map.addLayer(mbLayer, aMBL.id);
          layerAdded = true;
        }
      })
      if (!layerAdded) {
        map.addLayer(mbLayer);
      }
    })
  }

  addLayer(layerName) {
  	const layer = this.getLayer(layerName);
  	if (this.state.map && layer && !layer.active) {
  		layer.active = true;
      this._addLayer(this.state.map, layer);
      layer.onAdd(this.state.map);
  		this.setState({ activeLayers: [...this.state.activeLayers, layerName] });
  	}
  }
  removeLayer(layerName) {
  	const layer = this.getLayer(layerName);
  	if (this.state.map && layer && layer.active) {
  		layer.active = false;
  		layer.onRemove(this.state.map);
  		this.setState({ activeLayers: this.state.activeLayers.filter(ln => ln !== layerName) });
  	}
  }
  toggleLayerVisibility(layerName) {
  	const layer = this.getLayer(layerName);
  	if (this.state.map && layer) {
  		layer.toggleVisibility(this.state.map);
  	}
  }

  updatePopover(update) {
  	this.setState({ popover: { ...this.state.popover, ...update }});
  }

  toggleModal(layerName) {
  	const layer = this.getLayer(layerName),
  		show = layer.modal ? !layer.modal.show : false;
		this.props.layers.forEach(layer => {
			if (layer.modal) {
				layer.modal.show = false;
			}
		})
		if (layer.modal) {
			layer.modal.show = show;
		}
  	this.forceUpdate();
  }

  onSelect(layerName, selection) {
  	const layer = this.getLayer(layerName)

    layer.selection = selection;
    layer.loading = true;
    this.forceUpdate();
    
    layer.onSelect(selection)
      .then(data => layer.receiveData(this.state.map, data))
      .then(() => layer.loading = false)
      .then(() => this.forceUpdate());
  }

  toggleInfoBox(layerName, infoBoxName) {
  	const layer = this.getLayer(layerName)

  	if (layer.infoBoxes) {
  		const infoBox = layer.infoBoxes[infoBoxName];
  		if (infoBox) {
  			infoBox.show = !infoBox.show;
  		}
  	}
  	this.forceUpdate();
  }

  updateFilter(layerName, filterName, value) {
  	const layer = this.getLayer(layerName),
  		oldValue = layer.filters[filterName].value;

	  layer.filters[filterName].value = value;

  	if (layer.filters[filterName].onChange) {
  		layer.filters[filterName].onChange(this.state.map, layer, value, oldValue)
  	}

  	layer.loading = true;
  	this.forceUpdate();

  	layer.onFilterFetch(filterName, oldValue, value)
      .then(data => layer.receiveData(this.state.map, data))
      .then(() => layer.loading = false)
      .then(() => this.forceUpdate());

    if (layer.filters[filterName].refLayers) {
      layer.filters[filterName].refLayers.forEach(refLayerName => {
        const layer = this.getLayer(refLayerName);
        layer.filters[filterName].value = value;
        if (layer.active) {

          if (layer.filters[filterName].onChange) {
            layer.filters[filterName].onChange(this.state.map, layer, value, oldValue)
          }

          layer.loading = true;
          this.forceUpdate();

          layer.onFilterFetch(filterName, oldValue, value)
            .then(data => layer.receiveData(this.state.map, data))
            .then(() => layer.loading = false)
            .then(() => this.forceUpdate());

        }
      })
    }
  }

  updateLegend(layerName, update) {
  	const layer = this.getLayer(layerName);

		layer.legend = {
			...layer.legend,
			...update
		};
		layer.loading = true;
		this.forceUpdate();

  	layer.onLegendChange()
			.then(data => layer.receiveData(this.state.map, data))
			.then(() => layer.loading = false)
			.then(() => this.forceUpdate());
  }

  fetchLayerData(layerName) {
  	const layer = this.getLayer(layerName);

  	layer.loading = true;
  	this.forceUpdate();

  	layer.fetchData()
			.then(data => layer.receiveData(this.state.map, data))
			.then(() => layer.loading = false)
			.then(() => this.forceUpdate());
  }

  updateDrag(update) {
  	this.setState({
  		...this.state,
  		...update
  	})
  }
  dropLayer() {
		const activeLayers = this.state.activeLayers.filter(l => l !== this.state.dragging),
			insertBefore = activeLayers[this.state.dragover];
		activeLayers.splice(this.state.dragover, 0, this.state.dragging)
		const draggingLayer = this.getLayer(this.state.dragging),
			beforeLayer = this.getLayer(insertBefore);
		let beforeLayerId = null;
		if (beforeLayer) {
			beforeLayerId = beforeLayer.layers[0].id;
		}
		draggingLayer.layers.forEach(({ id }) => {
			this.state.map.moveLayer(id, beforeLayerId)
		})
		this.setState({ activeLayers });

    const layersWithZIndex = activeLayers.reduce((a, c) => {
      const layer = this.getLayer(c),
        mbLayers = layer.layers.reduce((a, c) => {
          return c.zIndex ? [...a, c] : a;
        }, []);
      return [...a, ...mbLayers];
    }, [])
    layersWithZIndex.sort((a, b) => a.zIndex - b.zIndex);
    layersWithZIndex.forEach(mbLayer => {
      this.state.map.moveLayer(mbLayer.id);
    })
  }

	render() {
		const actionMap = {
			toggleModal: this.toggleModal.bind(this),
			toggleInfoBox: this.toggleInfoBox.bind(this)
		}
		return (
			<div id={ this.props.id } style={ { height: this.props.height } }>
				<Sidebar layers={ this.props.layers }
					activeLayers={ this.state.activeLayers }
					theme={ this.props.theme }
					addLayer={ this.addLayer.bind(this) }
					removeLayer={ this.removeLayer.bind(this) }
					toggleLayerVisibility={ this.toggleLayerVisibility.bind(this) }
					actionMap= { actionMap }
					header={ this.props.header }
					toggleModal={ this.toggleModal.bind(this) }
					updateFilter={ this.updateFilter.bind(this) }
					updateLegend={ this.updateLegend.bind(this) }
					fetchLayerData={ this.fetchLayerData.bind(this) }
					updateDrag={ this.updateDrag.bind(this) }
					dropLayer={ this.dropLayer.bind(this) }/>
				<Infobox layers={ this.props.layers }
					theme={ this.props.theme }/>
				<MapPopover { ...this.state.popover }
					updatePopover={ this.updatePopover.bind(this) }/>
				<MapModal layers={ this.props.layers }
					toggleModal={ this.toggleModal.bind(this) }/>
			</div>
		)
	}
}

AvlMap.defaultProps = {
	id: getUniqueId(),
	height: "100%",
	style: 'mapbox://styles/am3081/cjms1pdzt10gt2skn0c6n75te',
	center: [-73.680647, 42.68],
	minZoom: 2,
	zoom: 10,
	layers: [],
	theme: theme,
	header: () => <h4 style={ { color: theme.textColorHl } }>Sidebar</h4>
}

export default AvlMap