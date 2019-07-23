import React from "react"

import mapboxgl from 'mapbox-gl/dist/mapbox-gl'
import { MAPBOX_TOKEN } from 'store/config'

import Sidebar from './components/sidebar'
import Infobox from './components/infobox/Infobox'
import MapPopover from "./components/popover/MapPopover"
import MapModal from "./components/modal/MapModal"
import MapActions from "./components/MapActions"
import MapMessages from "./components/MapMessages"

import DEFAULT_THEME from 'components/common/themes/dark'

import geoViewport from "@mapbox/geo-viewport"

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
	`unique-id-${ ++UNIQUE_ID }`

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
      messages: [],
      isOpen: true,
      transitioning: false,
      style: props.style ? { name: "Use Styles Prop", style: props.style } : props.styles[0]
  	}
    this.container = React.createRef();
  }

  componentDidMount() {
    const {
    	id,
    	center,
    	minZoom,
    	zoom,
      mapControl
    } = this.props;
    const map = new mapboxgl.Map({
      container: id,
      style: this.state.style.style,
      center,
      minZoom,
      zoom,
      attributionControl: false
    });

    if(mapControl) {
      map.addControl(new mapboxgl.NavigationControl(), mapControl);
    }

    map.boxZoom.disable();

    if(!this.props.scrollZoom) {
      map.scrollZoom.disable();
    };

    ([...document.getElementsByClassName("mapboxgl-ctrl-logo")])
      .forEach(logo => {
        logo.parentElement.style.margin = '0';
        logo.style.display = 'none';
      })

    this.props.layers.forEach(layer => layer.initComponent(this));

    map.on('load',  () => {
      const activeLayers = [];
      this.props.layers.forEach(layer => {

        layer.initMap(map);

      	if (layer.active) {
          this._addLayer(map, layer, activeLayers);
          activeLayers.push(layer.name);
					layer.onAdd(map);
      	}
      })

      if(this.props.fitBounds){
        map.fitBounds(this.props.fitBounds)
      }
      this.setState({ map, activeLayers })

    })
    // map.on('sourcedata', () => this.foceUpdate());
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

  sendMessage(layerName, data) {
    data = {
      id: getUniqueId(),
      duration: data.onConfirm ? 0 : 6000,
      ...data,
      update: false,
      layer: this.getLayer(layerName)
    }
console.log("<AvlMap.sendMessage>", layerName, data, [...this.state.messages]);
    const update = this.state.messages.reduce((a, c) => a || (c.id === data.id), false);
    let messages = [...this.state.messages];
    if (update) {
      messages = messages.map(({ id, Message, ...rest }) => ({
        Message: id === data.id ? data.Message : Message,
        id,
        ...rest,
        update: id === data.id ? Date.now() : false
      }))
    }
    else {
      messages = [...messages, data];
    }
    this.setState({ messages });
  }
  dismissMessage(id) {
    const messages = this.state.messages.filter(m => m.id !== id);
console.log("<AvlMap.dismissMessage>", id, messages);
    this.setState({ messages });
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
        if (mbLayer.beneath && Boolean(map.getLayer(mbLayer.beneath))) {
          map.addLayer(mbLayer, mbLayer.beneath);
        }
        else {
          map.addLayer(mbLayer);
        }
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
// console.log('updateFilter', layerName, filterName, value);

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

  onTransitionStart() {
    this.setState({ transitioning: true });
  }
  onOpenOrClose(isOpen) {
    this.setState({ isOpen, transitioning: false });
  }

  setMapStyle(style) {
    const { map } = this.state;
    if (Boolean(map) && (style.style !== this.state.style.style)) {
      map.once('style.load', e => {
        const activeLayers = [];
        this.state.activeLayers.forEach(layerName => {
        	const layer = this.getLayer(layerName);
          this._addLayer(map, layer, activeLayers);
          activeLayers.push(layerName);
          layer.onStyleChange(map);
        });
      })
      this.state.activeLayers.forEach(layerName => {
        const layer = this.getLayer(layerName);
        layer._onRemove(map);
      })
      map.setStyle(style.style);
    }
    this.setState({ style });
  }

	render() {
		const actionMap = {
			toggleModal: this.toggleModal.bind(this),
      updateModal: this.updateModal.bind(this),
			toggleInfoBox: this.toggleInfoBox.bind(this)
		}
    const mapStyles = [
      ...this.props.styles
    ]
    if (this.props.style) {
      mapStyles.unshift({ name: "Use styles prop!", style: this.props.style });
    }
		return (
			<div id={ this.props.id } style={ { height: this.props.height } } ref={ this.container }>

				{ !this.props.sidebar ? null :
          <Sidebar isOpen={ this.state.isOpen }
            transitioning={ this.state.transitioning }
            onOpenOrClose={ this.onOpenOrClose.bind(this) }
            onTransitionStart={ this.onTransitionStart.bind(this) }
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
  					dropLayer={ this.dropLayer.bind(this) }
            pages={ this.props.sidebarPages }
            mapStyles={ mapStyles }
            style={ this.state.style }
            setMapStyle={ this.setMapStyle.bind(this) }
            map={ this.state.map }/>
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
          isOpen={ this.state.isOpen && !this.state.transitioning || !this.state.isOpen && this.state.transitioning }
          theme={ this.props.theme }
          actionMap={ actionMap }/>

        <MapMessages
          messages={ this.state.messages }
          dismiss={ this.dismissMessage.bind(this) }/>
			</div>
		)
	}
}

const getMapPreview = (map, style, size=[60, 40]) => {
  if (!Boolean(map)) return "";

  return `https://api.mapbox.com/styles/v1/am3081/${ style }/static/` +
    `${ map.getCenter().toArray().join(',') },${ map.getZoom() },0,0/` +
    `${ size.join('x') }?` +
    `attribution=false&logo=false&access_token=${ mapboxgl.accessToken }`;
}
const getStaticImageUrl = style =>
  `https://api.mapbox.com/styles/v1/am3081/${ style }/static/` +
    `${ -74.2179 },${ 43.2994 },1.5/60x40?` +
    `attribution=false&logo=false&access_token=${ mapboxgl.accessToken }`

const DEFAULT_STYLES = [
  { name: "Dark",
    style: "mapbox://styles/am3081/cjqqukuqs29222sqwaabcjy29" },
  { name: "Light",
    style: 'mapbox://styles/am3081/cjms1pdzt10gt2skn0c6n75te' },
  { name: "Satellite",
    style: 'mapbox://styles/am3081/cjya6wla3011q1ct52qjcatxg' },
  { name: "Satellite Streets",
    style: `mapbox://styles/am3081/cjya70364016g1cpmbetipc8u` }
]
DEFAULT_STYLES.forEach(style => {
  style.url = getStaticImageUrl(style.style.slice(23));
})

AvlMap.defaultProps = {
	id: getUniqueId(),
	height: "100%",
	// style: 'mapbox://styles/am3081/cjms1pdzt10gt2skn0c6n75te',
  styles: [...DEFAULT_STYLES],
	center: [-73.680647, 42.68],
	minZoom: 2,
	zoom: 10,
	layers: [],
  mapControl: 'bottom-right',
	theme: DEFAULT_THEME,
  scrollZoom: true,
  sidebar: true,
  update: [],
	header: "AVAIL Map",
  sidebarPages: ["layers", "basemaps"]
}

export default AvlMap
