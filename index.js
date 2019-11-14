import React from "react"

import mapboxgl from 'mapbox-gl/dist/mapbox-gl'
import { MAPBOX_TOKEN } from 'store/config'

import get from "lodash.get"
import styled from "styled-components"

import Sidebar from './components/sidebar'
import Infobox from './components/infobox/Infobox'
import MapPopover from "./components/popover/MapPopover"
import MapModal from "./components/modal/MapModal"
import MapActions from "./components/MapActions"
import MapMessages from "./components/MapMessages"

import { ScalableLoading } from "components/loading/loadingPage"

import './avlmap.css'

mapboxgl.accessToken = MAPBOX_TOKEN

let UNIQUE_ID = 0;
const getUniqueId = (str = "unique-id") =>
	`${ str }-${ ++UNIQUE_ID }`

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

export const DEFAULT_STYLES = [
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

class AvlMap extends React.Component {

	static defaultProps = {
		id: getUniqueId(),
		height: "100%",
	  styles: [...DEFAULT_STYLES],
	  style: "Dark",
		center: [-73.680647, 42.68],
		minZoom: 2,
		zoom: 10,
		layers: [],
	  mapControl: 'bottom-right',
	  scrollZoom: true,
	  sidebar: true,
	  update: [],
		header: "AVAIL Map",
	  sidebarPages: ["layers", "basemaps"]
	}

  static ActiveMaps = {};
  static addActiveMap = (id, component, map) => {
    AvlMap.ActiveMaps[id] = { component, map };
  }
  static removeActiveMap = id => {
    delete AvlMap.ActiveMaps[id];
  }
  static updateMap = ([id, action, ...args]) => {
    if (id in AvlMap.ActiveMaps) {
      const { component } = AvlMap.ActiveMaps[id];
      component && component[action] && component[action].call(component, ...args);
    }
  }
  testFunc(...args) {
    console.log("TEST FUNCTION:", ...[...args].map(arg => arg.toString()));
  }

  constructor(props) {
    super(props);
  	this.state = {
  		map: null,
			dynamicLayers: [],
  		activeLayers: [],
      sources: {},
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
      style: props.styles.reduce((a, c) => c.name === props.style ? c : a, props.styles[0])
  	}
    this.MOUNTED = false;
    this.container = React.createRef();
  }

  setState(...args) {
    this.MOUNTED && super.setState(...args);
  }
  forceUpdate(...args) {
    this.MOUNTED && super.forceUpdate(...args);
  }

  componentDidMount() {
    this.MOUNTED = true;

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

    this.props.layers.forEach(layer => {
      layer.version = layer.version || 1.0;
      layer.initComponent(this)
    });

    map.on('load',  () => {
      const activeLayers = [];
      this.props.layers.forEach(layer => {

        layer.initMap(map);

      	if (layer.active) {
          this._addLayer(map, layer, activeLayers);
          activeLayers.push(layer.name);

          layer._onAdd(map);
          ++layer.loading;
					Promise.resolve(layer.onAdd(map))
            .then(() => --layer.loading)
            .then(() => layer.render(map))
            .then(() => this.forceUpdate());
      	}
      })

      if (this.props.fitBounds){
        map.fitBounds(this.props.fitBounds)
      }
      this.setState({ map, activeLayers })

      AvlMap.addActiveMap(id, this, map);
    })
    // map.on('sourcedata', () => this.foceUpdate());
    this.setContainerSize();
  }
  componentWillUnmount() {
    // this.state.activeLayers.forEach(layer => this.removeLayer(layer));

    this.MOUNTED = false;

    AvlMap.removeActiveMap(this.props.id);
  }

  componentDidUpdate(oldProps, oldState) {
    this.setContainerSize();
  }

	addDynamicLayer(layerName, layerFactory) {
		if (!this.state.map) return;

		const layer = this.getLayer(layerName);

		if (!layer) return;

		const newLayer = layerFactory.call(null, layer),
			newLayerName = newLayer.name,
			allLayers = [
				...this.props.layers,
				...this.state.dynamicLayers
			];

		newLayer._isDynamic = true;
		newLayer.initComponent(this);
		newLayer.initMap(this.state.map);

		const adjustName = allLayers.reduce((a, c) =>
			a || c.name === newLayerName
		, false)

		if (adjustName) {
			const regExpStr = newLayerName + " " + "\\((\\d+)\\)",
				regex = new RegExp(regExpStr),
				num = allLayers.reduce((a, c) => {
					const match = regex.exec(c.name);
					if (match) {
						return Math.max(a, +match[1]);
					}
					return a;
				}, 1);
			newLayer.name = `${ newLayerName } (${ num + 1 })`;
		}
  	if (newLayer.active) {
      this._addLayer(this.state.map, newLayer);
      ++newLayer.loading;
      newLayer._onAdd(this.state.map);
      Promise.resolve(newLayer.onAdd(this.state.map))
        .then(() => --newLayer.loading)
        .then(() => newLayer.render(this.state.map))
        .then(() => this.forceUpdate());
      this.setState({ activeLayers: [...this.state.activeLayers, newLayer.name] });
  	}

		this.setState({
			dynamicLayers: [
				...this.state.dynamicLayers,
				newLayer
			]
		})
	}
	deleteDynamicLayer(layerName) {
		const layer = this.getLayer(layerName);

		if (!layer) return;

		this.removeLayer(layerName);

		this.setState({
			dynamicLayers: this.state.dynamicLayers.filter(l => l.name !== layerName)
		})
	}

  sendMessage(layerName, data) {
    data = {
      id: getUniqueId(),
      duration: data.onConfirm ? 0 : 6000,
      ...data,
      update: false,
      layer: this.getLayer(layerName)
    }
// console.log("<AvlMap.sendMessage>", layerName, data, [...this.state.messages]);
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
// console.log("<AvlMap.dismissMessage>", id, messages);
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
  	return [
			...this.props.layers,
			...this.state.dynamicLayers
		].reduce((a, c) => c.name === layerName ? c : a, null);
  }

  _addLayer(map, newLayer, activeLayers=this.state.activeLayers) {
    const sources = { ...this.state.sources };

    const sourcesToAdd = new Set(newLayer.layers.map(l => l.source))

    newLayer.sources.forEach(source => {
      if (!sourcesToAdd.has(source.id)) return;

      if (!map.getSource(source.id)) {
        map.addSource(source.id, source.source);
      }
      if (!(source.id in sources)) {
        sources[source.id] = [];
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
      sources[mbLayer.source].push(mbLayer.id)
    })

    this.setState({ sources });
  }

  addLayer(layerName) {
  	const layer = this.getLayer(layerName);
  	if (this.state.map && layer && !layer.active) {
  		layer.active = true;
      this._addLayer(this.state.map, layer);
      ++layer.loading;
      layer._onAdd(this.state.map);
      Promise.resolve(layer.onAdd(this.state.map))
        .then(() => --layer.loading)
        .then(() => layer.render(this.state.map))
        .then(() => this.forceUpdate());
      this.setState({ activeLayers: [...this.state.activeLayers, layerName] });
  	}
  }
  removeLayer(layerName) {
  	const layer = this.getLayer(layerName);
  	if (this.state.map && layer && layer.active && !layer.loading) {
  		layer.active = false;
  		layer._onRemove(this.state.map);
  		layer.onRemove(this.state.map);

      const sourcesToRemove = []
  		layer.layers.forEach(layer => {
  			this.state.map.removeLayer(layer.id);
        sourcesToRemove.push([layer.source, layer.id])
  		});

      const sources = { ...this.state.sources };
      sourcesToRemove.forEach(([sourceId, layerId]) => {
        if (sourceId in sources) {
          sources[sourceId] = sources[sourceId].filter(lId => lId !== layerId);
        }
      })

  		layer.sources.forEach(source => {
        if (get(sources, [source.id, "length"], "not-added") === 0) {
          this.state.map.removeSource(source.id);
          delete sources[source.id]
        }
  		})

  		this.setState({ activeLayers: this.state.activeLayers.filter(ln => ln !== layerName), sources });
  	}
    else if (this.state.map && layer && layer.active && layer.loading) {
      this.sendMessage(null, { Message: "Cannot remove a layer while it is loading." })
    }
  }
  toggleLayerVisibility(layerName) {
  	const layer = this.getLayer(layerName);
  	if (this.state.map && layer) {
  		layer.toggleVisibility(this.state.map);
			this.forceUpdate();
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
    modal.props = modal.props ? { ...modal.props, ...props } : props;
    if (!show && (typeof modal.onClose === "function")) {
      modal.onClose.call(layer);
    }
  	this.forceUpdate();
  }
  updateModal(layerName, modalName, props={}) {
    const layer = this.getLayer(layerName),
      modal = layer.modals[modalName];
    modal.props = modal.props ? { ...modal.props, ...props } : props;
    this.forceUpdate();
  }

  onSelect(layerName, selection) {
    if (!this.state.map) return;

  	const layer = this.getLayer(layerName)

    layer.selection = selection;
    ++layer.loading;
    this.forceUpdate();

    layer.onSelect(selection)
      .then(() => layer.fetchData())
      .then(data => layer.active && (layer.receiveDataOld(this.state.map, data), layer.render(this.state.map)))
      .then(() => --layer.loading)
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
    if (!this.state.map) return;

  	const layer = this.getLayer(layerName),
      filter = layer.filters[filterName],
  		oldValue = filter.value,
      domain = filter.domain;

	  filter.value = value;

  	if (layer.filters[filterName].onChange) {
      if (layer.version >= 2) {
        layer.filters[filterName].onChange.call(layer, oldValue, value, domain);
      }
      else {
        layer.filters[filterName].onChange(this.state.map, layer, value, oldValue);
      }
  	}

  	++layer.loading;
  	this.forceUpdate();

  	layer.onFilterFetch(filterName, oldValue, value)
      .then(data => layer.active && (layer.receiveDataOld(this.state.map, data), layer.render(this.state.map)))
      .then(() => --layer.loading)
      .then(() => this.forceUpdate());

    if (layer.filters[filterName].refLayers) {
      layer.filters[filterName].refLayers.forEach(refLayerName => {

      	const layer = this.getLayer(refLayerName),
          filter = layer.filters[filterName],
      		oldValue = filter.value,
          domain = filter.domain;

        filter.value = value;

        if (layer.active) {

          if (layer.filters[filterName].onChange) {
            if (layer.version >= 2) {
              layer.filters[filterName].onChange.call(layer, oldValue, value, domain);
            }
            else {
              layer.filters[filterName].onChange(this.state.map, layer, value, oldValue);
            }
          }

          ++layer.loading;
          this.forceUpdate();

          layer.onFilterFetch(filterName, oldValue, value)
            .then(data => layer.active && (layer.receiveDataOld(this.state.map, data), layer.render(this.state.map)))
            .then(() => --layer.loading)
            .then(() => this.forceUpdate());
        }
      })
    }
  }

  updateLegend(layerName, update) {
    if (!this.state.map) return;

  	const layer = this.getLayer(layerName);

		layer.legend = {
			...layer.legend,
			...update
		};
		++layer.loading;
		this.forceUpdate();

  	layer.onLegendChange()
			.then(data => layer.active && (layer.receiveDataOld(this.state.map, data), layer.render(this.state.map)))
			.then(() => --layer.loading)
			.then(() => this.forceUpdate());
  }

  fetchLayerData(layerName) {
    if (!this.state.map) return;

  	const layer = this.getLayer(layerName);

  	++layer.loading;
  	this.forceUpdate();

  	layer.fetchData()
			.then(data => layer.active && (layer.receiveDataOld(this.state.map, data), layer.render(this.state.map)))
			.then(() => --layer.loading)
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
		const allLayers = [
			...this.props.layers,
			...this.state.dynamicLayers
		]
		return (
			<div id={ this.props.id } style={ { height: this.props.height } } ref={ this.container }>

				{ !this.props.sidebar ? null :
          <Sidebar isOpen={ this.state.isOpen }
            transitioning={ this.state.transitioning }
            onOpenOrClose={ this.onOpenOrClose.bind(this) }
            onTransitionStart={ this.onTransitionStart.bind(this) }
            layers={ allLayers }
  					activeLayers={ this.state.activeLayers }
  					addLayer={ this.addLayer.bind(this) }
  					removeLayer={ this.removeLayer.bind(this) }
						deleteDynamicLayer={ this.deleteDynamicLayer.bind(this) }
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
            mapStyles={ this.props.styles }
            style={ this.state.style }
            setMapStyle={ this.setMapStyle.bind(this) }
            map={ this.state.map }/>
        }

				<Infobox layers={ allLayers }/>

				<MapPopover { ...this.state.popover }
					updatePopover={ this.updatePopover.bind(this) }
          mapSize={ {
            width: this.state.width,
            height: this.state.height
          } }/>

				<MapModal layers={ allLayers }
					toggleModal={ this.toggleModal.bind(this) }/>

        <MapActions layers={ allLayers }
          sidebar={ this.props.sidebar }
          isOpen={ this.state.isOpen && !this.state.transitioning || !this.state.isOpen && this.state.transitioning }
          actionMap={ actionMap }/>

        <MapMessages
          messages={ this.state.messages }
          dismiss={ this.dismissMessage.bind(this) }/>

        <LoadingLayers layers={ allLayers }
          sidebar={ this.props.sidebar }
          isOpen={ this.state.isOpen && !this.state.transitioning || !this.state.isOpen && this.state.transitioning }/>
			</div>
		)
	}
}

const LoadingContainer = styled.div`
	position: absolute;
	bottom: 20px;
	left: ${ props => props.sidebar && props.isOpen ? 340 : props.sidebar && !props.isOpen ? 40 : 20 }px;
	transition: left 0.25s;
	z-index: 50;
	display: flex;
	flex-direction: column;
  pointer-events: none;
  color: ${ props => props.theme.textColorHl };

  > * {
    margin-bottom: 10px;
    min-width: 300px;
    background-color: ${ props => props.theme.sidePanelBg };
    border-radius: 4px;
    border-top-left-radius: ${ props => (props.height + props.padding * 2) * 0.5 }px;
    border-bottom-left-radius: ${ props => (props.height + props.padding * 2) * 0.5 }px;
    font-size: 1rem;
  }
  > *:last-child {
    margin-bottom: 0px;
  }
`

const LoadingLayers = ({ layers, sidebar, isOpen }) => {
  const loadingLayers = layers.reduce((a, c) => {
    if (c.loading) a.push(c.name);
    return a;
  }, [])
  const height = 40,
    padding = 10;
  return (
    <LoadingContainer sidebar={ sidebar } isOpen={ isOpen } height={ height } padding={ padding }>
      {
        loadingLayers.map((name, i) => (
          <div key={ name } style={ { height: `${ height + 20 }px`, padding: `${ padding }px`, display: "flex" } }>
            <ScalableLoading scale={ height * 0.01 }/>
            <div style={ { paddingLeft: `${ padding }px`, height: `${ height }px`, lineHeight: `${ height }px`, textAlign: "right", width: `calc(100% - ${ height }px)` } }>
              { name }
            </div>
          </div>
        ))
      }
    </LoadingContainer>
  )
}

export default AvlMap
