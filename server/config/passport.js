const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ providerId: profile.id, provider: 'google' });
      
      if (!user) {
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          user.provider = 'google';
          user.providerId = profile.id;
          user.avatar = profile.photos[0]?.value || '';
          await user.save();
        } else {
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0]?.value || '',
            provider: 'google',
            providerId: profile.id
          });
          await user.save();
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  console.log('Google OAuth not configured - skipping');
}

// GitHub Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/api/auth/github/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ providerId: profile.id, provider: 'github' });
      
      if (!user) {
        const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
        user = await User.findOne({ email });
        if (user) {
          user.provider = 'github';
          user.providerId = profile.id;
          user.avatar = profile.photos[0]?.value || '';
          await user.save();
        } else {
          user = new User({
            name: profile.displayName || profile.username,
            email,
            avatar: profile.photos[0]?.value || '',
            provider: 'github',
            providerId: profile.id
          });
          await user.save();
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
} else {
  console.log('GitHub OAuth not configured - skipping');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
