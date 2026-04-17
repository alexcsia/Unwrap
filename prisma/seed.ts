import prisma from "@/utils/prisma.util";
import bcrypt from "bcrypt";

const DEV_USER_ID = "1234";

async function main() {
  console.log("Cleaning database...");
  // Ordered delete to satisfy relations
  await prisma.listeningHistory.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.internalAuthSessions.deleteMany();
  await prisma.connectedPlatforms.deleteMany();
  await prisma.exclusion.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.create({
    data: {
      id: DEV_USER_ID,
      email: "test@example.com",
      displayName: "Dev User",
      passwordHash,
    },
  });

  // 1. DYNAMICALLY GENERATE 10 ARTISTS
  const artistNames = [
    "The Midnight",
    "Gunship",
    "Taylor Swift",
    "The Weeknd",
    "Daft Punk",
    "Metric",
    "CHVRCHES",
    "Lady Gaga",
    "Paramore",
    "Falloutboy",
  ];

  const artistPool = artistNames.map((name) => ({
    name,
    platformId: `artist_${name.toLowerCase().replace(/\s/g, "_")}`,
  }));

  // 2. DYNAMICALLY GENERATE 50 TRACKS
  const trackPool: any[] = [];
  for (let i = 1; i <= 50; i++) {
    // Assign 1-3 random artists to each track
    const numArtists = Math.floor(Math.random() * 2) + 1;
    const trackArtists = [...artistPool]
      .sort(() => 0.5 - Math.random())
      .slice(0, numArtists);

    trackPool.push({
      id: `sp_track_${i}`,
      name: `Dynamic Track ${i}`,
      album: `Testing Album ${Math.ceil(i / 5)}`, // 5 tracks per album
      artists: trackArtists,
    });
  }

  console.log("Generating multi-year mock data (2023-2025)...");

  const years = [2023, 2024, 2025];

  for (const year of years) {
    for (let month = 0; month < 12; month++) {
      console.log(`Seeding ${month + 1}/${year}...`);

      // 50 plays per month
      for (let i = 0; i < 50; i++) {
        // Use exponential randomness so some tracks get played MUCH more than others
        // This makes Top Tracks/Artists charts look realistic
        const weight = Math.pow(Math.random(), 3);
        const trackIndex = Math.floor(weight * trackPool.length);
        const track = trackPool[trackIndex]!;

        const day = Math.floor(Math.random() * 28) + 1;
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);

        const playedAt = new Date(year, month, day, hour, minute);

        await prisma.listeningHistory.create({
          data: {
            userId: DEV_USER_ID,
            platformName: "spotify",
            platformTrackId: track.id,
            trackName: track.name,
            albumName: track.album,
            durationMs: 150000 + Math.floor(Math.random() * 100000),
            playedAt,
            source: "spotify_api",
            metadata: {},
            artists: {
              connectOrCreate: track.artists.map((a: any) => ({
                where: { platformId: a.platformId },
                create: {
                  name: a.name,
                  platformId: a.platformId,
                  genres: ["Testing"],
                  imageUrl: `https://picsum.photos/seed/${a.platformId}/200`,
                },
              })),
            },
          },
        });
      }
    }
  }

  console.log(
    "✅ Seed complete! Created 10 artists, 50 tracks, and ~1,800 play events.",
  );
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
