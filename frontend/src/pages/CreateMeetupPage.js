import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { createMeetupApi } from '../api/meetup.api';
import '../utils/leafletIcons';
import styles from './CreateMeetupPage.module.css';

const CATEGORIES = [
  'social', 'sports', 'music', 'food',
  'tech', 'art', 'outdoor', 'gaming', 'study', 'other',
];

const DEFAULT_CENTER = [12.9716, 77.5946];

// ── Map click handler ──────────────────────────────────────────
const PinDropper = ({ onDrop }) => {
  useMapEvents({
    click: (e) => onDrop(e.latlng),
  });
  return null;
};

// ── Reverse geocode via OpenStreetMap (free, no API key) ───────
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

const CreateMeetupPage = () => {
  const navigate = useNavigate();

  const [pin, setPin]         = useState(null); // { lat, lng }
  const [address, setAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const [form, setForm] = useState({
    title:       '',
    description: '',
    category:    'social',
    capacity:    10,
    startsAt:    '',
    endsAt:      '',
    tags:        '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // ── Drop pin on map click ──────────────────────────────────
  const handleDrop = useCallback(async ({ lat, lng }) => {
    setPin({ lat, lng });
    setGeocoding(true);
    const addr = await reverseGeocode(lat, lng);
    setAddress(addr);
    setGeocoding(false);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!pin) {
      setError('Please click the map to drop a pin for your meetup location.');
      return;
    }

    if (!form.startsAt) {
      setError('Please set a start time.');
      return;
    }

    setLoading(true);
    try {
      await createMeetupApi({
        title:       form.title,
        description: form.description,
        category:    form.category,
        coordinates: [pin.lng, pin.lat], // GeoJSON: [lng, lat]
        address,
        capacity:    parseInt(form.capacity),
        startsAt:    new Date(form.startsAt).toISOString(),
        endsAt:      form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        tags:        form.tags
                       ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
                       : [],
      });

      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create meetup.');
    } finally {
      setLoading(false);
    }
  };

  // Min datetime for input (now)
  const minDateTime = new Date(Date.now() + 5 * 60000)
    .toISOString().slice(0, 16);

  return (
    <div className={styles.wrapper}>

      {/* ── Left: Map ──────────────────────────────────────── */}
      <div className={styles.mapSide}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={13}
          className={styles.map}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <PinDropper onDrop={handleDrop} />
          {pin && <Marker position={[pin.lat, pin.lng]} />}
        </MapContainer>

        {/* Map instruction overlay */}
        <div className={styles.mapHint}>
          {pin
            ? geocoding
              ? '📍 Getting address...'
              : '📍 Pin dropped — move it by clicking elsewhere'
            : '👆 Click anywhere on the map to set location'
          }
        </div>
      </div>

      {/* ── Right: Form ────────────────────────────────────── */}
      <div className={styles.formSide}>

        {/* Header */}
        <div className={styles.formHeader}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            ← Back
          </button>
          <div className={styles.formLogo}>
            <span style={{ color: '#4f8ef7' }}>◎</span> circlo
          </div>
        </div>

        <h1 className={styles.formTitle}>Create a Meetup</h1>
        <p className={styles.formSubtitle}>
          Drop a pin on the map, then fill in the details.
        </p>

        {/* Location preview */}
        <div className={`${styles.locationBox} ${pin ? styles.locationSet : ''}`}>
          <span className={styles.locationIcon}>📍</span>
          <span className={styles.locationText}>
            {pin
              ? geocoding ? 'Getting address...' : address
              : 'No location set — click the map'
            }
          </span>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label}>Title *</label>
            <input
              className={styles.input}
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Evening run at Cubbon Park"
              required
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="What's this meetup about?"
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Category + Capacity row */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Category *</label>
              <select
                className={styles.select}
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Capacity *</label>
              <input
                className={styles.input}
                type="number"
                name="capacity"
                value={form.capacity}
                onChange={handleChange}
                min={2}
                max={500}
                required
              />
            </div>
          </div>

          {/* Start time */}
          <div className={styles.field}>
            <label className={styles.label}>Starts At *</label>
            <input
              className={styles.input}
              type="datetime-local"
              name="startsAt"
              value={form.startsAt}
              onChange={handleChange}
              min={minDateTime}
              required
            />
          </div>

          {/* End time */}
          <div className={styles.field}>
            <label className={styles.label}>Ends At <span className={styles.optional}>(optional)</span></label>
            <input
              className={styles.input}
              type="datetime-local"
              name="endsAt"
              value={form.endsAt}
              onChange={handleChange}
              min={form.startsAt || minDateTime}
            />
          </div>

          {/* Tags */}
          <div className={styles.field}>
            <label className={styles.label}>
              Tags <span className={styles.optional}>(comma separated, max 5)</span>
            </label>
            <input
              className={styles.input}
              name="tags"
              value={form.tags}
              onChange={handleChange}
              placeholder="e.g. running, fitness, casual"
            />
          </div>

          {/* Submit */}
          <button
            className={styles.submitBtn}
            type="submit"
            disabled={loading || !pin}
          >
            {loading
              ? <><span className={styles.spinner} /> Creating...</>
              : '🚀 Create Meetup'
            }
          </button>

          {!pin && (
            <p className={styles.pinWarning}>
              Drop a pin on the map first
            </p>
          )}

        </form>
      </div>
    </div>
  );
};

export default CreateMeetupPage;