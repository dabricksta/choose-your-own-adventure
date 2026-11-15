// Small pure helpers shared by the engine and by story state modules.

export const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const toInt = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
};

export const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';

export const stringList = (value, limit) => Array.isArray(value)
  ? value.filter(item => typeof item === 'string').slice(0, limit)
  : [];

export function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}
