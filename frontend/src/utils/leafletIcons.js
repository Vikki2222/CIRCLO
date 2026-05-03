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

// Custom colored circle markers for meetup status
export const createMeetupIcon = (status) => {
  const color = status === 'full' ? '#ef4444' : '#22c55e';
  const ring  = status === 'full' ? '#991b1b' : '#166534';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 20px; height: 20px;
        background: ${color};
        border: 3px solid ${ring};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        transition: transform 0.3s ease;
      "></div>
    `,
    iconSize:   [20, 20],
    iconAnchor: [10, 10],
  });
};

export const createUserIcon = () => L.divIcon({
  className: '',
  html: `
    <div style="
      width: 16px; height: 16px;
      background: #4f8ef7;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 4px rgba(79,142,247,0.3);
    "></div>
  `,
  iconSize:   [16, 16],
  iconAnchor: [8, 8],
});