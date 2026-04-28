const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email returned from Google'), null);
        }

        // 1. Already has a Google account → log in
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // 2. Email exists with local account → link Google to it
        user = await User.findOne({ email });
        if (user) {
          user.googleId = profile.id;
          user.authProvider = 'google';
          if (!user.avatar) user.avatar = profile.photos?.[0]?.value || null;
          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }

        // 3. New user → create account
        user = await User.create({
          name: profile.displayName,
          email,
          googleId: profile.id,
          authProvider: 'google',
          avatar: profile.photos?.[0]?.value || null,
          // No password — OAuth users authenticate via Google
        });

        return done(null, user);
      } catch (err) {
        logger.error(`Google OAuth error: ${err.message}`);
        return done(err, null);
      }
    }
  )
);

// Passport session not used (we use JWT), but required for OAuth dance
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;