import { Marker, Tooltip } from 'react-leaflet';
import { createMeetupIcon } from '../utils/leafletIcons';

const MeetupPin = ({ meetup, onClick }) => {
  const [lng, lat] = meetup.location.coordinates;

  return (
    <Marker
      position={[lat, lng]}
      icon={createMeetupIcon(meetup.status)}
      eventHandlers={{ click: () => onClick(meetup) }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
        <div style={{ fontFamily: 'Arial', minWidth: 120 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{meetup.title}</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {meetup.attendeeCount ?? meetup.attendees?.length ?? 0} / {meetup.capacity} joined
          </div>
          {meetup.status === 'full' && (
            <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>FULL</div>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
};

export default MeetupPin;