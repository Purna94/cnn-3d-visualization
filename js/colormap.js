const colormap = (function () {
  function interpolate(a, b, t) {
    return a.map((v, i) => v + (b[i] - v) * t);
  }
  const stops = [
    [0,   0,   0,   0.3],   // near-zero → dark
    [0.1, 0,   0,   0.8],   // low → purple-blue
    [0.3, 0.2, 0.4, 1.0],   // medium → blue
    [0.5, 0.0, 0.8, 0.8],   // mid → cyan
    [0.7, 0.0, 1.0, 0.3],   // high → green
    [0.9, 0.8, 1.0, 0.0],   // very high → yellow-green
    [1.0, 1.0, 1.0, 0.0],   // max → yellow
  ];
  const lookup = new Array(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let lo = 0;
    while (lo < stops.length - 2 && stops[lo + 1][0] < t) lo++;
    const hi = lo + 1;
    const tLo = stops[lo][0], tHi = stops[hi][0];
    const frac = tHi === tLo ? 0 : (t - tLo) / (tHi - tLo);
    const [_, ...rgbLo] = stops[lo];
    const [_2, ...rgbHi] = stops[hi];
    const [r, g, b] = interpolate(rgbLo, rgbHi, frac);
    lookup[i] = [r, g, b];
  }
  return {
    get(val, min = 0, max = 1) {
      if (max === min) return [0.1, 0.1, 0.3];
      const t = Math.max(0, Math.min(1, (val - min) / (max - min)));
      return lookup[Math.round(t * 255)];
    },
    getHex(val, min = 0, max = 1) {
      const [r, g, b] = this.get(val, min, max);
      return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
    },
    getCSS(val, min = 0, max = 1) {
      const [r, g, b] = this.get(val, min, max);
      return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
    },
  };
})();
