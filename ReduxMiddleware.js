import get from "lodash.get"

const LISTENERS = new Map();

export const AvlInTheMiddle = store => next => action => {
  const result = next(action);
  if (LISTENERS.has(action.type)) {
    LISTENERS.get(action.type).forEach(({ comp, path }) => {
      const data = path.length ? get(store.getState(), path, {}) : store.getState();
      comp.receiveMessage.call(comp, action.type, data);
    })
  }
  return result;
}

export const register = (comp, action, path = []) => {
  if (!LISTENERS.has(action)) {
    LISTENERS.set(action, []);
  }
  LISTENERS.get(action).push({ comp, path });
}
export const unregister = (comp, action = null) => {
  if (action === null) {
    [...LISTENERS.keys()].forEach(a => unregister(comp, a));
  }
  else if (LISTENERS.has(action)) {
    const filtered = LISTENERS.get(action).filter(d => d.comp !== comp);
    LISTENERS.set(action, filtered);
  }
}
