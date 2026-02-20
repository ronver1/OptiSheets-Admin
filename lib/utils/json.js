export function stableStringify(value) {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(x) {
  if (Array.isArray(x)) return x.map(sortDeep);
  if (x && typeof x === "object") {
    return Object.keys(x)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortDeep(x[k]);
        return acc;
      }, {});
  }
  return x;
}
