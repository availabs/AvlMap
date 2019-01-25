const DEFAULT_OPTIONS = {
	sources: [],
	layers: [],

	active: false,
	loading: false,

	popover: false,
	actions: false,
	modal: false,
	infoBoxes: false,
	legend: false,
	filters: false,
	select: false

}

class MapLayer {
	constructor(name, _options) {
		const options = { ...DEFAULT_OPTIONS, ..._options };

		this.component = null;

		this.name = name;

		this.sources = options.sources;
		this.layers = options.layers;

		this.active = options.active;

		this.popover = options.popover;
		this.actions = options.actions;
		this.modal = options.modal;
		this.infoBoxes = options.infoBoxes;
		this.legend = options.legend;
		this.filters = options.filters;
		this.select = options.select;

		this.loading = options.loading;

		this._mousemove = this._mousemove.bind(this);
		this._mouseleave = this._mouseleave.bind(this);
		this._click = this._click.bind(this);
	}

	init(component) {
		this.component = component;
		this.updatePopover = component.updatePopover.bind(component);
    // this.onSelect = component.onSelect.bind(component)
	}

	onAdd(map) {
		this.sources.forEach(source => {
      let duplicate = Object.keys(map.style.sourceCaches)
        .filter(sourceId => sourceId === source.id)
      if (duplicate.length === 0) {
        map.addSource(source.id, source.source) 
      } 
       
		})
		this.layers.forEach(layer => {
			map.addLayer(layer);
		})
		if (this.popover) {
			this.addPopover(map);
		}
		if (this.select) {
			this.addBoxSelect(map);
		}
	}
	onRemove(map) {
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
		return this.fetchData();
	}
	fetchData() {
		return Promise.resolve();
	}
	receiveData(data, map) {
	}

	addPopover(map) {
		this.popover.layers.forEach(layer => {
			map.on("mousemove", layer, this._mousemove);
			map.on("mouseleave", layer, this._mouseleave);
			map.on("click", layer, this._click);
		})
	}
	removePopover(map) {
		this.popover.layers.forEach(layer => {
			map.off("mousemove", layer, this._mousemove);
			map.off("mouseleave", layer, this._mouseleave);
			map.off("click", layer, this._click);
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
      	data: this.popover.dataFunc(e.features[0])
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
	_click(e) {
		const { map, popover } = this.component.state,
    	{ pinned } = popover;

    if (e.features.length) {
    	const data = this.popover.dataFunc(e.features[0]);
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

	addBoxSelect(map) {
		map.boxZoom.disable();
		const canvas = map.getCanvasContainer(),
			selectFrom = this.select.fromLayers,
			toHighlight = this.select.highlightLayers,
			selectProperty = this.select.property,
			selectFilter = ['in', selectProperty],
			maxSelection = this.select.maxSelection || 5000;
		
		toHighlight.forEach(layer => {
			map.setFilter(
        layer.id, 
        ["in", selectProperty]
      );  
		})

		let start, current, box = null, selection = [];

		const onMouseDown = e => {
      if (!(e.shiftKey && e.button === 0)) return;

      map.dragPan.disable();

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('keydown', onKeyDown);

      start = mousePos(e);
		}

		canvas.addEventListener('mousedown', onMouseDown, true);

		const mousePos = e => {
			const rect = canvas.getBoundingClientRect();
			return [
				e.clientX - rect.left - canvas.clientLeft,
				e.clientY - rect.top - canvas.clientTop
			]
		}
  	function onMouseMove(e) {
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
	  function onMouseUp(e) {
      finish([start, mousePos(e)]);
	  }
	  function onKeyDown(e) {
      if (e.keyCode === 27) finish();
	  }

  	let finish = (bbox) => {
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
            return window.alert('Select a smaller number of features');
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
      // store.dispatch(onLayerSelect(selection, mapLayer.id))
  	}
	}
	removeBoxSelect(map) {

	}
}

export default MapLayer

/*

export const boxSelect = (mapLayer, map) => {
  map.boxZoom.disable();
  let canvas = map.getCanvasContainer();
  let selectLayers = mapLayer.selectLayers;
  let selectFilter = mapLayer.selectFilter;
  let selectProperty = mapLayer.selectProperty;
  let renderLayers = mapLayer.selectRenderLayers;
  let selection = [];

  // Variable to hold the starting xy coordinates
  // when `mousedown` occured.
  var start;

  // Variable to hold the current xy coordinates
  // when `mousemove` or `mouseup` occurs.
  var current;

  // Variable for the draw box element.
  var box;
  // Set `true` to dispatch the event before other functions
  // call it. This is necessary for disabling the default map
  // dragging behaviour.
  canvas.addEventListener('mousedown', mouseDown, true);

  
  // Return the xy coordinates of the mouse position
  function mousePos(e) {
      var rect = canvas.getBoundingClientRect();
      return new mapboxgl.Point(
          e.clientX - rect.left - canvas.clientLeft,
          e.clientY - rect.top - canvas.clientTop
      );
  }

  function mouseDown(e) {
      // Continue the rest of the function if the shiftkey is pressed.
      if (!(e.shiftKey && e.button === 0)) return;

      // Disable default drag zooming when the shift key is held down.
      map.dragPan.disable();

      // Call functions for the following events
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('keydown', onKeyDown);

      // Capture the first xy coordinates
      start = mousePos(e);
  }

  function onMouseMove(e) {
      // Capture the ongoing xy coordinates
      current = mousePos(e);

      // Append the box element if it doesnt exist
      if (!box) {
          box = document.createElement('div');
          box.classList.add('boxdraw');
          canvas.appendChild(box);
      }

      var minX = Math.min(start.x, current.x),
          maxX = Math.max(start.x, current.x),
          minY = Math.min(start.y, current.y),
          maxY = Math.max(start.y, current.y);

      // Adjust width and xy position of the box element ongoing
      var pos = 'translate(' + minX + 'px,' + minY + 'px)';
      box.style.transform = pos;
      box.style.WebkitTransform = pos;
      box.style.width = maxX - minX + 'px';
      box.style.height = maxY - minY + 'px';
  }

  function onMouseUp(e) {
      // Capture xy coordinates
      finish([start, mousePos(e)]);
  }

  function onKeyDown(e) {
      // If the ESC key is pressed
      if (e.keyCode === 27) finish();
  }

  function finish(bbox) {
      // Remove these events now that finish has been called.
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mouseup', onMouseUp);

      if (box) {
          box.parentNode.removeChild(box);
          box = null;
      }

      // If bbox exists. use this value as the argument for `queryRenderedFeatures`
      if (bbox) {
          //console.log('queryRenderedFeatures',  bbox, renderLayers)
          var features = map.queryRenderedFeatures(bbox, { layers: renderLayers });
          
          if (features.length >= 5000) {
              return window.alert('Select a smaller number of features');
          }

          // Run through the selected features and set a filter
          // to match features with unique FIPS codes to activate
          // the `counties-highlighted` layer.
          var filter = features.reduce(function(memo, feature) {
              memo.push(feature.properties[selectProperty]);
              return memo;
          }, selectFilter.slice(0));

          selection = features.map(d => d.properties[selectProperty])
          

          //map.setFilter("npmrds_primary_selected", filter);
          selectLayers.forEach( layer => {
            //console.log(["all",...layer.defaultFilters,filter])
            map.setFilter(
              layer.name, 
              ["all",...layer.defaultFilters,filter]
            );  
          })
          
      }

      map.dragPan.enable();
      store.dispatch(onLayerSelect(selection, mapLayer.id))
  }
}
*/