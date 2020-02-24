const listeners = new Map();

const registedFilters = new Map();

export const listen = (layer, otherLayerName) => {
  if (!listeners.has(otherLayerName)) {
    listeners.set(otherLayerName, []);
  }
  listeners.get(otherLayerName).push(layer);
}
export const unlisten = layer => {
  for (let [key, value] of listeners) {
    value = value.filter(l => l != layer);
  }
}

export class FilterMessage {
  constructor(layerName, filterName, oldValue, newValue) {
    this.type = "FilterMessage";
    this.layerName = layerName;
    this.filterName = filterName;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }
}

export const dispatchMessage = (layerName, message) => {
  console.log("DISPATCH:", layerName, message);
  if (listeners.has(layerName)) {
    for (const listener of listeners.get(layerName)) {
      listener.receiveLayerMessage(message)
    }
  }
}
