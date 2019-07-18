import React from "react"

import AttributesTable from "./components/AttributesTable"

import get from "lodash.get"

const DEFAULT_OPTIONS = {
	sources: [],
	layers: [],

	active: false,
	loading: false,

	popover: false,
	actions: false,
  modals: false,
	infoBoxes: false,
	legend: false,
	filters: false,
	select: false,
  onClick: false,

  onHover: false,
  hoveredFeatureIds: new Set(),

	showAttributesModal: true,

  mapActions: {},

  selection: []
}

class MapLayer {
	constructor(name, _options) {
		const options = { ...DEFAULT_OPTIONS, ..._options };

		this.component = null;

		this.name = name;

    for (const key in options) {
      this[key] = options[key];
    }

    this.boundFunctions = {};
    this.hoverSourceData = {};

		this._mousemove = this._mousemove.bind(this);
		this._mouseleave = this._mouseleave.bind(this);
		this._popoverClick = this._popoverClick.bind(this);

    this._mousedown = this._mousedown.bind(this);

    this._mapClick = this._mapClick.bind(this);

    this.onHoverMove = this.onHoverMove.bind(this);
    this.onHoverLeave = this.onHoverLeave.bind(this);
	}

  initComponent(component) {
    this.component = component;
    this.updatePopover = component.updatePopover.bind(component);
		if (this.showAttributesModal !== false) {
			const modals = this.modals || {};
			this.modals = {
				...modals,
				attributes: {
					title: "Attributes",
					comp: ({ layer }) =>
						<div style={ { width: "800px" } }>
							<AttributesTable layer={ layer }/>
						</div>,
					show: false,
					position: "bottom"
				}
			};

			if (!get(this, 'component.props.sidebar', false)) {
				this.mapActions = {
					...this.mapActions,
					attributes: {
						Icon: ({ layer }) => <span className={ `fa fa-lg fa-eye` }/>,
						tooltip: "Toggle Attributes",
						action: function() {
							this.doAction([
								"toggleModal",
								"attributes"
							])
						}
					}
				}
			}
			else {
				const actions = this.actions || [];
				this.actions = [
					...actions,
			    {
			      Icon: () => <span className={ `fa fa-lg fa-eye` }/>,
			      action: ["toggleModal", "attributes"],
			      tooltip: "Toggle Attributes"
			    }
				]
			}
		}
  }
	initMap(map) {
    this.map = map;
	}

	onAdd(map) {
		this._onAdd(map);
	}
	_onAdd(map) {
		if (this.popover) {
			this.addPopover(map);
		}
		if (this.select) {
			this.addBoxSelect(map);
		}
    if (this.onClick) {
      this.addOnClick(map);
    }
    if (this.onHover) {
      this.addOnHover(map);
    }
	}
	onRemove(map) {
		this._onRemove(map);
	}
	_onRemove(map) {
    if (this.onHover) {
      this.removeOnHover(map);
    }
    if (this.onClick) {
      this.removeOnClick(map);
    }
    if (this.select) {
      this.removeBoxSelect(map);
    }
		if (this.popover) {
			this.removePopover(map);
		}
		this.layers.forEach(layer => {
			map.removeLayer(layer.id);
		});
		this.sources.forEach(source => {
			map.removeSource(source.id);
		})
	}
	onStyleChange(map) {
		// this._onRemove(map);
		this._onAdd(map);
	}

  addOnHover(map) {
    this.onHover.layers.forEach(layer => {
      const data = this.layers.reduce((a, c) => c.id === layer ? c : a, false);
      this.hoverSourceData[layer] = {
        source: data.source,
        sourceLayer: data['source-layer']
      };

      let func = e => this.onHoverMove(e, layer);
      this.boundFunctions[`on-hover-move-${ layer }`] = func;
      map.on("mousemove", layer, func);

      func = e => this.onHoverLeave(e, layer);
      this.boundFunctions[`on-hover-leave-${ layer }`] = func;
      map.on("mouseleave", layer, func);
    })
  }
  removeOnHover(map) {
    this.onHover.layers.forEach(layer => {
      let key = `on-hover-move-${ layer }`,
        func = this.boundFunctions[key];
      map.off("mousemove", layer, func);
      delete this.boundFunctions[key];

      key = `on-hover-leave-${ layer }`;
      func = this.boundFunctions[key];
      map.off("mouseleave", layer, func);
      delete this.boundFunctions[key];
    })
  }
  onHoverMove(e, layer) {
    const dataFunc = this.onHover.dataFunc;
    (typeof dataFunc === "function") &&
      dataFunc.call(this, e.features, e.point, e.lngLat, layer)

    const data = this.hoverSourceData[layer];
    if (data) {
      this.hoveredFeatureIds.forEach(id => {
        (id !== undefined) && this.map.setFeatureState({ id, ...data }, { hover: false });
      })
      this.hoveredFeatureIds.clear();

      e.features.forEach(({ id }) => {
        (id !== undefined) && this.hoveredFeatureIds.add(id);
        (id !== undefined) && this.map.setFeatureState({ id, ...data }, { hover: true });
      })
    }
  }
  onHoverLeave(e, layer) {
    const data = this.hoverSourceData[layer];
    if (data) {
      this.hoveredFeatureIds.forEach(id => {
        this.map.setFeatureState({ id, ...data }, { hover: false });
      })
      this.hoveredFeatureIds.clear();
    }
  }

  doAction([action, ...args]) {
// console.log(this.name, action, ...args)
    if (this.component && this.component[action]) {
      this.component[action](this.name, ...args)
    }
  }
  forceUpdate() {
    this.component && this.component.forceUpdate();
  }

	toggleVisibility(map) {
		this.layers.forEach(layer => {
			const visible = map.getLayoutProperty(layer.id, 'visibility');
			map.setLayoutProperty(layer.id, 'visibility', visible === "none" ? "visible" : "none");
		})
	}

	onFilterFetch(filterName, oldValue, newValue) {
		return this.fetchData();
	}
	onLegendChange() {
		return this.onFilterFetch();
	}
	fetchData() {
		return this.onFilterFetch();
	}
  onSelect(selection) {
    return this.onFilterFetch();
  }
	receiveData(map, data) {
	}

  addOnClick(map) {
    this.onClick.layers.forEach(layer => {
      const func = e => this._mapClick(e, layer);

      this.boundFunctions[`on-click-${ layer }`] = func;

      if (layer === 'map') {
        map.on('click', func);
      }
      else {
        map.on("click", layer, func)
      }
    })
  }
  removeOnClick(map) {
    this.onClick.layers.forEach(layer => {
      const key = `on-click-${ layer }`,
        func = this.boundFunctions[key];

      if (layer === 'map') {
        map.off('click', func);
      }
      else {
        map.off("click", layer, func)
      }

      delete this.boundFunctions[key];
    })
  }
  _mapClick(e, layer) {
    this.onClick.dataFunc.call(this, e.features, e.point, e.lngLat, layer);
  }

	addPopover(map) {
		this.popover.layers.forEach(layer => {
			map.on("mousemove", layer, this._mousemove);
			map.on("mouseleave", layer, this._mouseleave);
      if (!this.popover.noSticky && !this.onClick) {
        map.on("click", layer, this._popoverClick);
      }
		})
	}
	removePopover(map) {
		this.popover.layers.forEach(layer => {
			map.off("mousemove", layer, this._mousemove);
			map.off("mouseleave", layer, this._mouseleave);
      if (!this.popover.noSticky && !this.onClick) {
        map.off("click", layer, this._popoverClick);
      }
		})
	}
	_mousemove(e) {
		const { map, popover } = this.component.state;
		map.getCanvas().style.cursor = 'pointer';

    const { pinned } = popover;
    if (pinned) return;

    if (e.features.length) {
      this.updatePopover({
      	pos: [e.point.x, e.point.y],
      	data: this.popover.dataFunc.call(this, e.features[0], e.features)
      })
    }
	}
	_mouseleave(e) {
		const { map, popover } = this.component.state;
    map.getCanvas().style.cursor = '';

    const { pinned } = popover;
    if (pinned) return;

    this.updatePopover({
        data: []
    })
	}
	_popoverClick(e) {
		const { map, popover } = this.component.state,
    	{ pinned } = popover;

    if (e.features.length) {
    	const data = this.popover.dataFunc.call(this, e.features[0], e.features);
    	if (data.length) {
    		if (pinned) {
    			this.updatePopover({
    				pos: [e.point.x, e.point.y],
    				data
    			})
    		}
    		else {
    			this.updatePopover({
    				pinned: true
    			})
    		}
    	}
    	else {
    		this.updatePopover({
    			pinned: false
    		})
    	}
    }
	}

  _mousedown(e) {
    if (!(e.shiftKey && e.button === 0)) return;

    const { map } = this.component.state;

    map.dragPan.disable();

    const canvas = map.getCanvasContainer(),
      selectFrom = this.select.fromLayers,
      toHighlight = this.select.highlightLayers,
      selectProperty = this.select.property,
      selectFilter = ['in', selectProperty],
      maxSelection = this.select.maxSelection || 5000;

    const mousePos = e => {
      const rect = canvas.getBoundingClientRect();
      return [
        e.clientX - rect.left - canvas.clientLeft,
        e.clientY - rect.top - canvas.clientTop
      ]
    }

    let start = mousePos(e), current, box = null, selection = [];

    const onMouseMove = e => {
      current = mousePos(e);

      if (!box) {
        box = document.createElement('div');
        box.classList.add('boxdraw');
        canvas.appendChild(box);
      }

      var minX = Math.min(start[0], current[0]),
        maxX = Math.max(start[0], current[0]),
        minY = Math.min(start[1], current[1]),
        maxY = Math.max(start[1], current[1]);

      var pos = 'translate(' + minX + 'px,' + minY + 'px)';
      box.style.transform = pos;
      box.style.WebkitTransform = pos;
      box.style.width = maxX - minX + 'px';
      box.style.height = maxY - minY + 'px';
    }
    const onMouseUp = e => {
      finish([start, mousePos(e)]);
    }
    const onKeyDown = e => {
      if (e.keyCode === 27) finish();
    }

    const finish = (bbox) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mouseup', onMouseUp);

      if (box) {
        box.parentNode.removeChild(box);
        box = null;
      }

      if (bbox) {
        var features = map.queryRenderedFeatures(bbox, { layers: selectFrom });

        if (features.length >= maxSelection) {
          map.dragPan.enable();
          return window.alert(`Select a smaller number of features. You selected ${ features.length }. The maximum is ${ maxSelection }.`);
        }

        var filter = features.reduce(function(filter, feature) {
            filter.push(feature.properties[selectProperty]);
            return filter;
        }, selectFilter.slice());

        selection = features.map(d => d.properties[selectProperty])

        toHighlight.forEach(layer => {
          map.setFilter(
            layer.id,
            layer.filter ? ['all', layer.filter, filter] : filter
          );
        })
      }

      map.dragPan.enable();
      this.component.onSelect(this.name, selection);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
  }
  addBoxSelect(map) {
    this.select.highlightLayers.forEach(layer => {
      map.setFilter(
        layer.id,
        ["in", this.select.property]
      );
    })

    const canvas = map.getCanvasContainer();
    canvas.addEventListener('mousedown', this._mousedown, true);
  }
	removeBoxSelect(map) {
    const canvas = map.getCanvasContainer();
    canvas.removeEventListener('mousedown', this._mousedown, true);
	}
}

export default MapLayer
