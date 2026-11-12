import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from './db.js';
import { config } from '../config.js';

// Only initialize Google OAuth if the required environment variables are present
if (config.googleClientId && config.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: config.googleCallbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found from Google'), undefined);
          }

          let user = await prisma.user.findUnique({ where: { email } });

          if (user) {
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { email },
                data: { googleId: profile.id, oauthProvider: 'google' },
              });
            }
            return done(null, user);
          }

          user = await prisma.user.create({
            data: {
              email,
              googleId: profile.id,
              oauthProvider: 'google',
            },
          });

          return done(null, user);
        } catch (err) {
          return done(err, undefined);
        }
      }
    )
  );
} else {
  console.warn('Google OAuth is not configured. The /auth/google routes will be unavailable.');
}

export default passport;