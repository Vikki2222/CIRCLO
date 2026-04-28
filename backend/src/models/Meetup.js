const mongoose = require('mongoose');

const meetupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meetup title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'social',
          'sports',
          'music',
          'food',
          'tech',
          'art',
          'outdoor',
          'gaming',
          'study',
          'other',
        ],
        message: 'Invalid category: {VALUE}',
      },
    },

    // --- Creator ---
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Meetup must have a host'],
      index: true,
    },

    // --- GeoJSON Point ---
    // MongoDB requires this exact shape for 2dsphere queries
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: [true, 'Location type is required'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude] — GeoJSON order (lon first!)
        required: [true, 'Coordinates are required'],
        validate: {
          validator: (coords) =>
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 && coords[0] <= 180 && // longitude
            coords[1] >= -90  && coords[1] <= 90,    // latitude
          message: 'Coordinates must be [longitude, latitude] with valid ranges',
        },
      },
      address: {
        type: String,
        trim: true,
        maxlength: [200, 'Address cannot exceed 200 characters'],
      },
    },

    // --- Capacity ---
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [2, 'Capacity must be at least 2'],
      max: [500, 'Capacity cannot exceed 500'],
    },

    // Attendees array — source of truth for join/leave logic
    attendees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // --- Scheduling ---
    startsAt: {
      type: Date,
      required: [true, 'Start time is required'],
      validate: {
        validator: function (value) {
          // Allow past dates only in test env
          if (process.env.NODE_ENV === 'test') return true;
          return value > new Date();
        },
        message: 'Start time must be in the future',
      },
    },

    endsAt: {
      type: Date,
      validate: {
        validator: function (value) {
          if (!value) return true; // Optional
          return value > this.startsAt;
        },
        message: 'End time must be after start time',
      },
    },

    // --- Status ---
    status: {
      type: String,
      enum: ['active', 'full', 'cancelled', 'ended'],
      default: 'active',
      index: true,
    },

    // Tags for better discoverability
    tags: {
      type: [String],
      validate: {
        validator: (tags) => tags.length <= 5,
        message: 'Cannot have more than 5 tags',
      },
    },

    // Cover image URL (optional)
    coverImage: {
      type: String,
      default: null,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────────────────────
// INDEXES
// ─────────────────────────────────────────────

// Core geo index — enables $near, $geoWithin queries
meetupSchema.index({ location: '2dsphere' });

// Compound index: active meetups sorted by start time
// Used in the "discover nearby" query
meetupSchema.index({ status: 1, startsAt: 1 });

// Host's meetups listing
meetupSchema.index({ host: 1, createdAt: -1 });

// TTL index — auto-mark ended meetups (optional, Mongo handles cleanup)
// We handle status transitions in the service layer instead for more control

// ─────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────

// Current number of attendees
meetupSchema.virtual('attendeeCount').get(function () {
  return this.attendees?.length ?? 0;
});

// Whether meetup is at capacity
meetupSchema.virtual('isFull').get(function () {
  return (this.attendees?.length ?? 0) >= this.capacity;
});

// Spots remaining
meetupSchema.virtual('spotsLeft').get(function () {
  return Math.max(0, this.capacity - (this.attendees?.length ?? 0));
});

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────

// Auto-update status when attendees array changes
meetupSchema.pre('save', function (next) {
  if (this.isModified('attendees') && this.status !== 'cancelled') {
    this.status = this.attendees.length >= this.capacity ? 'full' : 'active';
  }
  next();
});

// Normalize tags to lowercase, remove duplicates
meetupSchema.pre('save', function (next) {
  if (this.isModified('tags') && this.tags?.length) {
    this.tags = [...new Set(this.tags.map((t) => t.toLowerCase().trim()))];
  }
  next();
});

// ─────────────────────────────────────────────
// QUERY HELPERS
// ─────────────────────────────────────────────

// Automatically exclude soft-deleted docs from all queries
meetupSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

// ─────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────

/**
 * Find meetups near a coordinate within a radius.
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @param {number} radiusKm - Search radius in kilometers
 */
meetupSchema.statics.findNearby = function (lng, lat, radiusKm = 10) {
  return this.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000, // Convert km → meters
      },
    },
    status: { $in: ['active', 'full'] },
    startsAt: { $gte: new Date() },
  });
};

const Meetup = mongoose.model('Meetup', meetupSchema);
module.exports = Meetup;