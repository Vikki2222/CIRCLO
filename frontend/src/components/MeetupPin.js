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
      <Tooltip direction="top" offset={[0, -10]} opacity={1} className="sq-tooltip">
        <div style={{ minWidth: 120 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{meetup.title}</div>
          <div style={{ color: 'var(--sq-muted)' }}>
            {meetup.attendeeCount ?? meetup.attendees?.length ?? 0} / {meetup.capacity} joined
          </div>
          {meetup.status === 'full' && (
            <div style={{ color: 'var(--sq-red)', fontWeight: 700 }}>Full</div>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
};

export default MeetupPin;