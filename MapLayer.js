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

		// this.sources = options.sources;
		// this.layers = options.layers;

		// this.active = options.active;
  //   this.loading = options.loading;

		// this.popover = options.popover;
		// this.actions = options.actions;
		// this.modals = options.modals;
		// this.infoBoxes = options.infoBoxes;
		// this.legend = options.legend;
		// this.filters = options.filters;
		// this.select = options.select;
  //   this.onClick = options.onClick;

  //   this.selection = options.selection;

		this._mousemove = this._mousemove.bind(this);
		this._mouseleave = this._mouseleave.bind(this);
		this._popoverClick = this._popoverClick.bind(this);

    this._mousedown = this._mousedown.bind(this);

    this._mapClick = this._mapClick.bind(this);
	}

	init(component, map) {
		this.component = component;
    this.map = map;
		this.updatePopover = component.updatePopover.bind(component);
	}

	onAdd(map) {
		// this.sources.forEach(source => {
  //     if (!map.getSource(source.id)) {
  //       map.addSource(source.id, source.source);
  //     }
		// })
		// this.layers.forEach(layer => {
		// 	map.addLayer(layer);
		// })
		if (this.popover) {
			this.addPopover(map);
		}
		if (this.select) {
			this.addBoxSelect(map);
		}
    if (this.onClick) {
      this.addOnClick(map);
    }
	}
	onRemove(map) {
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

  doAction([action, ...args]) {
// console.log(this.name, action, ...args)
    if (this.component[action]) {
      this.component[action](this.name, ...args)
    }
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
      if (layer === 'map') {
        map.on('click', this._mapClick);
      }
      else {
        map.on("click", layer, this._mapClick)
      }
    })
  }
  removeOnClick(map) {
    this.onClick.layers.forEach(layer => {
      if (layer === 'map') {
        map.off('click', this._mapClick);
      }
      else {
        map.off("click", layer, this._mapClick)
      }
    })
  }
  _mapClick(e) {
    this.onClick.dataFunc.call(this, e.features, e.point, e.lngLat);
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
      	data: this.popover.dataFunc.call(this, e.features[0])
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
    	const data = this.popover.dataFunc.call(this, e.features[0]);
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