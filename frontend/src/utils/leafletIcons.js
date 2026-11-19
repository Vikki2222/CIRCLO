import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Webpack breaks Leaflet's default icon URLs — fix them manually
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

// Square pixel pins: lime when there is room, red when full
export const createMeetupIcon = (status) => {
  const color = status === 'full' ? '#ff4b3e' : '#c4f25e';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 18px; height: 18px;
        background: ${color};
        box-shadow: 0 0 0 3px #111111, 3px 3px 0 3px #000;
      "></div>
    `,
    iconSize:   [18, 18],
    iconAnchor: [9, 9],
  });
};

// "You are here" marker
export const createUserIcon = () =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        width: 14px; height: 14px;
        background: #efeee6;
        box-shadow: 0 0 0 3px #111111, 0 0 0 5px #efeee6;
      "></div>
    `,
    iconSize:   [14, 14],
    iconAnchor: [7, 7],
  });
