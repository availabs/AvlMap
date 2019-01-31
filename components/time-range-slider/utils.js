const durationSecond = 1000;
const durationMinute = durationSecond * 60;
const durationHour = durationMinute * 60;
const durationDay = durationHour * 24;
const durationWeek = durationDay * 7;
const durationYear = durationDay * 365;

export const BASE_SPEED = 600;

export function getTimeWidgetTitleFormatter(domain) {
  if (!Array.isArray(domain)) {
    return null;
  }

  const diff = domain[1] - domain[0];
console.log("<getTimeWidgetTitleFormatter>",domain,diff)
  return diff > durationYear
    ? 'MM/DD/YY'
    : diff > durationWeek
      ? 'MM/DD/YY'
      : diff > durationDay
        ? 'MM/DD hha'
        : 'MM/DD hh:mma';
}

export function preciseRound(num, decimals) {
  const t = Math.pow(10, decimals);
  return (
    Math.round(
      num * t +
        (decimals > 0 ? 1 : 0) *
          (Math.sign(num) * (10 / Math.pow(100, decimals)))
    ) / t
  ).toFixed(decimals);
}

export function getRoundingDecimalFromStep(step) {
  const splitZero = step.toString().split('.');
  if (splitZero.length === 1) {
    return 0;
  }
  return splitZero[1].length;
}

export function roundValToStep(minValue, step, val) {
  if (isNaN(step)) {
    return val;
  }

  const decimal = getRoundingDecimalFromStep(step);
  const steps = Math.floor((val - minValue) / step);
  let remain = val - (steps * step + minValue);

  // has to round because javascript turns 0.1 into 0.9999999999999987
  remain = Number(preciseRound(remain, 8));

  let closest;
  if (remain === 0) {
    closest = val;
  } else if (remain < step / 2) {
    closest = steps * step + minValue;
  } else {
    closest = (steps + 1) * step + minValue;
  }

  // precise round return a string rounded to the defined decimal
  const rounded = preciseRound(closest, decimal);

  return Number(rounded);
}

export function getTimeWidgetHintFormatter(domain) {
  if (!Array.isArray(domain)) {
    return null;
  }

  const diff = domain[1] - domain[0];
  return diff > durationYear
    ? 'MM/DD/YY'
    : diff > durationWeek
      ? 'MM/DD'
      : diff > durationDay
        ? 'MM/DD hha'
        : diff > durationHour
          ? 'hh:mma'
          : 'hh:mm:ssa';
}