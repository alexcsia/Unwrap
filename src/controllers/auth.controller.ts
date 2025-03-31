import passport from 'passport';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import prisma from '../utils/prisma.util';
import { saveUser } from '../models/user.model'

passport.use(
    new SpotifyStrategy(
        {
            clientID: process.env.SPOTIFY_CLIENT_ID!,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
            callbackURL: process.env.SPOTIFY_CALLBACK_URI!,
        },
        async (accessToken, refreshToken, expires_in, profile, done) => {
            try {
                const spotifyId = profile.id as string;

                let user = await saveUser( spotifyId, accessToken, refreshToken, profile );

                return done(null, user);
            } catch (error) {
                console.error('Error during authentication:', error);
                return done(error as Error, undefined);
            }
        }
    )
);

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: id as string }
        });
        done(null, user);
    } catch (error) {
        console.error('Error during deserialization:', error);
        done(error, null);
    }
});
