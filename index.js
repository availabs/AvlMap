import React from "react"

import mapboxgl from 'mapbox-gl/dist/mapbox-gl'
import { MAPBOX_TOKEN } from 'store/config'

import Sidebar from './components/sidebar'
import Infobox from './components/infobox/Infobox'
import MapPopover from "./components/popover/MapPopover"
import MapModal from "./components/modal/MapModal"
import MapActions from "./components/MapActions"

import DEFAULT_THEME from 'components/common/themes/dark'

import './avlmap.css'

import TimeRangeSldier from "./components/time-range-slider/time-range-slider"

let emptyStyle = {
  "version": 8,
  "name": "Empty",
  "metadata": {
    "mapbox:autocomposite": true,
    "mapbox:type": "template"
  },
  "glyphs": "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  "sources": {},
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": {
        "background-color": "rgba(0,0,0,0)"
      }
    }
  ]
}

mapboxgl.accessToken = MAPBOX_TOKEN

let UNIQUE_ID = 0;
const getUniqueId = () =>
	`avl-map-${ ++UNIQUE_ID }`

class AvlMap extends React.Component {
  constructor(props) {
    super(props);
  	this.state = {
  		map: null,
  		activeLayers: [],
  		popover: {
  			pos: [0, 0],
  			pinned: false,
  			data: []
  		},
  		dragging: null,
  		dragover: null,
      width: 0,
      height: 0,
  	}
    this.container = React.createRef();
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
      zoom,
      attributionControl: false
    });
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.boxZoom.disable();
    if(!this.props.scrollZoom) {
      map.scrollZoom.disable();
    }
    map.on('load',  () => {
      const activeLayers = [];
      this.props.layers.forEach(layer => {
        layer.init(this, map);
      	if (layer.active) {
          this._addLayer(map, layer, activeLayers);
          activeLayers.push(layer.name);
					layer.onAdd(map)
      	}
      })

      if(this.props.fitBounds){
        map.fitBounds(this.props.fitBounds)
      }
      this.setState({ map, activeLayers })
      
      let logo = document.getElementsByClassName("mapboxgl-ctrl-logo")
      //console.log('test', logo)
      if(logo[0]){
        logo[0].style.display = 'none'
      }

    })
    this.setContainerSize();
  }

  componentDidUpdate(oldProps, oldState) {
    this.setContainerSize();
    if (oldProps.update !== this.props.update){
        let self = this;
        let filters = [];
        filters.push({
            'layer': oldProps.layers,
            'filters': oldProps.layers[0].filters,
            'filterName': Object.keys(oldProps.layers[0].filters)
        });
        filters.forEach(function(a){
            Object.keys(a.filters).forEach(function(each_filter){
                a.layer[0].onFilterFetch(each_filter,oldProps.update,a.filters[each_filter].value)
                    .then(data => a.layer[0].receiveData(self.state.map, data))
                    .then(() => a.layer[0].loading = false)
                    .then(() => self.forceUpdate);
            })
        })
    }
  }

  setContainerSize() {
    const div = this.container.current,
      width = div.scrollWidth,
      height = div.scrollHeight;
    if ((width !== this.state.width) || (height !== this.state.height)) {
      this.setState({ width, height })
    }
  }

  getLayer(layerName) {
  	return this.props.layers.reduce((a, c) => c.name === layerName ? c : a, null);
  }

  _addLayer(map, newLayer, activeLayers=this.state.activeLayers) {
    newLayer.sources.forEach(source => {
      if (!map.getSource(source.id)) {
        map.addSource(source.id, source.source);
      }
    })

    const activeMBLayers = activeLayers.reduce((a, ln) => {
      const layer = this.props.layers.reduce((a, c) => c.name === ln ? c : a);
      return [...a, ...layer.layers];
    }, [])

    const newMBLayers = newLayer.layers.slice();
    newMBLayers.sort((a, b) => {
      const azi = a.zIndex || 0,
        bzi = b.zIndex || 0;
      return azi - bzi;
    })

    //console.log('mbLayers', newMBLayers)

    newMBLayers.forEach(mbLayer => {
      const zIndex = mbLayer.zIndex || 0;
      let layerAdded = false;
      activeMBLayers.forEach(aMBL => {
        const aMBLzIndex = aMBL.zIndex || 0;
        if (aMBLzIndex > zIndex) {
          if(!map.getLayer(mbLayer.id)) {
            map.addLayer(mbLayer, aMBL.id);
            layerAdded = true;
          }
        }
      })
      if (!layerAdded) {
        mbLayer.beneath ? map.addLayer(mbLayer, mbLayer.beneath) : map.addLayer(mbLayer);
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

  toggleModal(layerName, modalName, props={}) {
  	const layer = this.getLayer(layerName),
      modal = layer.modals[modalName],
      show = !modal.show;
		this.props.layers.forEach(layer => {
			if (layer.modals) {
        for (const modal in layer.modals) {
				  layer.modals[modal].show = false;
        }
			}
		})
    modal.show = show;
    modal.props = props;
  	this.forceUpdate();
  }
  updateModal(layerName, modalName, props={}) {
    const layer = this.getLayer(layerName),
      modal = layer.modals[modalName];
    modal.props = props;
    this.forceUpdate();
  }

  onSelect(layerName, selection) {
  	const layer = this.getLayer(layerName)

    layer.selection = selection;
    layer.loading = true;
    this.forceUpdate();
    
    layer.onSelect(selection)
      .then(() => layer.fetchData())
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
    console.log('updateFilter')
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
      updateModal: this.updateModal.bind(this),
			toggleInfoBox: this.toggleInfoBox.bind(this)
		}
		return (
			<div id={ this.props.id } style={ { height: this.props.height } } ref={ this.container }>

				{ this.props.sidebar ? 
          <Sidebar 
            layers={ this.props.layers }
  					activeLayers={ this.state.activeLayers }
  					theme={ this.props.theme }
  					addLayer={ this.addLayer.bind(this) }
  					removeLayer={ this.removeLayer.bind(this) }
  					toggleLayerVisibility={ this.toggleLayerVisibility.bind(this) }
  					actionMap= { actionMap }
  					header={ this.props.header }
  					toggleModal={ this.toggleModal.bind(this) }
            updateModal={ this.updateModal.bind(this) }
  					updateFilter={ this.updateFilter.bind(this) }
  					updateLegend={ this.updateLegend.bind(this) }
  					fetchLayerData={ this.fetchLayerData.bind(this) }
  					updateDrag={ this.updateDrag.bind(this) }
  					dropLayer={ this.dropLayer.bind(this) }/>
            : <React.Fragment />
        }

				<Infobox layers={ this.props.layers }
					theme={ this.props.theme }/>
				<MapPopover { ...this.state.popover }
					updatePopover={ this.updatePopover.bind(this) }
          mapSize={ {
            width: this.state.width,
            height: this.state.height
          } }/>
				<MapModal layers={ this.props.layers }
					toggleModal={ this.toggleModal.bind(this) }
          theme={ this.props.theme }/>
        <MapActions layers={ this.props.layers }
          sidebar={ this.props.sidebar }
          theme={ this.props.theme }/>
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
	theme: DEFAULT_THEME,
  scrollZoom: true,
  sidebar: true,
  update: [],
	header: () => <h4 style={ { color: DEFAULT_THEME.textColorHl } }>Sidebar</h4>
}

export default AvlMap