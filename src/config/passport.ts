import passport from "passport";
import { Strategy as SpotifyStrategy } from "passport-spotify";
import { connectSpotify } from "@/models/connectedPlatforms";

passport.use(
  new SpotifyStrategy(
    {
      clientID: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      callbackURL: process.env.SPOTIFY_CALLBACK_URI!,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, expiresIn, profile, done) => {
      try {
        if (!req.user) {
          return done(new Error("Unauthorized: No session found"));
        }
        const userId = req.user.id;
        const spotifyId = profile.id as string;

        await connectSpotify(
          userId,
          spotifyId,
          accessToken,
          refreshToken,
          profile,
        );

        return done(null, req.user);
      } catch (error) {
        console.error("Error during authentication:", error);
        return done(error as Error, undefined);
      }
    },
  ),
);
