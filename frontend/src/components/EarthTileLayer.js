import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { EARTH } from '../utils/earthPalette';

/**
 * OpenStreetMap tiles redrawn in the same earth palette as the landing-page
 * globe. Each tile is loaded into a canvas; every pixel is sorted by what it
 * shows (water, greenery, main roads, everything else) and recoloured along
 * that feature's palette ramp, keeping its original brightness.
 */

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Blend two palette colours: t = 0 gives a, t = 1 gives b
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Each kind of map feature gets its own ramp through the earth palette.
// Brightness from the original tile picks the point on the ramp, so text
// and outlines stay readable. The ramps are kept narrow on purpose: land
// and buildings sit close together and colours are softened, so the map
// reads as calm background and the pins stand out.
// Stops: [luminance, [r, g, b]].
const SOFT_LAND = mix(EARTH.dry, EARTH.sand, 0.12);
const RAMPS = {
  land: [            // land, buildings, rails, labels and their halos
    [0,   [52, 46, 36]],                      // label text: dark, not black
    [150, mix(EARTH.rock, EARTH.dry, 0.5)],
    [205, mix(SOFT_LAND, EARTH.rock, 0.12)],  // buildings: barely darker than land
    [242, SOFT_LAND],                         // base land
    [255, mix(EARTH.sand, EARTH.snow, 0.08)], // minor roads and label halos
  ],
  green: [           // parks, grass, woods
    [140, mix(EARTH.jungle, SOFT_LAND, 0.25)],
    [200, mix(EARTH.forest, SOFT_LAND, 0.3)],
    [255, mix(EARTH.grass, SOFT_LAND, 0.3)],
  ],
  water: [
    [110, mix(EARTH.ocean, SOFT_LAND, 0.15)],
    [200, mix(EARTH.shallow, SOFT_LAND, 0.2)],
    [255, mix(EARTH.shallow, EARTH.air, 0.4)],
  ],
  road: [            // coloured main roads
    [150, SOFT_LAND],
    [215, mix(EARTH.sand, EARTH.snow, 0.08)],
    [255, mix(EARTH.sand, EARTH.snow, 0.25)],
  ],
};

const sample = (ramp, lum) => {
  if (lum <= ramp[0][0]) return ramp[0][1];
  for (let i = 1; i < ramp.length; i++) {
    const [l1, c1] = ramp[i];
    if (lum <= l1) {
      const [l0, c0] = ramp[i - 1];
      const t = (lum - l0) / (l1 - l0);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return ramp[ramp.length - 1][1];
};

const classify = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = max === 0 ? 0 : (max - min) / max;

  let hue = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue = (hue * 60 + 360) % 360;
  }

  let ramp = RAMPS.land;
  if (sat > 0.1 && hue >= 170 && hue <= 235) ramp = RAMPS.water;
  else if (sat > 0.1 && hue >= 70 && hue < 170) ramp = RAMPS.green;
  else if (sat > 0.18 && lum > 150) ramp = RAMPS.road;

  const c = sample(ramp, lum);
  return [Math.round(c[0]), Math.round(c[1]), Math.round(c[2])];
};

// Many pixels share a colour, so remember each answer
const cache = new Map();
const recolor = (data) => {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let c = cache.get(key);
    if (!c) {
      c = classify(data[i], data[i + 1], data[i + 2]);
      if (cache.size < 50000) cache.set(key, c);
    }
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
  }
};

const EarthTiles = L.TileLayer.extend({
  createTile(coords, done) {
    const tile = document.createElement('canvas');
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ctx = tile.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size.x, size.y);
      try {
        const frame = ctx.getImageData(0, 0, size.x, size.y);
        recolor(frame.data);
        ctx.putImageData(frame, 0, 0);
      } catch {
        // If the browser blocks pixel access, keep the original tile
      }
      done(null, tile);
    };
    img.onerror = (e) => done(e, tile);
    img.src = this.getTileUrl(coords);
    return tile;
  },
});

const EarthTileLayer = () => {
  const map = useMap();

  useEffect(() => {
    const layer = new EarthTiles(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map]);

  return null;
};

export default EarthTileLayer;
