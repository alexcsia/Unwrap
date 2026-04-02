import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const DEV_USER_ID = "1234";

async function main() {
  console.log("Cleaning database...");
  await prisma.listeningHistory.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.internalAuthSessions.deleteMany();
  await prisma.connectedPlatforms.deleteMany();
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

  const tracks = [
    {
      name: "Cruel Summer",
      artists: ["Taylor Swift"],
      album: "Lover",
      id: "sp_1",
    },
    {
      name: "Blinding Lights",
      artists: ["The Weeknd"],
      album: "After Hours",
      id: "sp_2",
    },
    {
      name: "Creepin'",
      artists: ["Metro Boomin", "The Weeknd", "21 Savage"],
      album: "Heroes & Villains",
      id: "sp_3",
    },
    {
      name: "Stay",
      artists: ["The Kid LAROI", "Justin Bieber"],
      album: "F*ck Love 3",
      id: "sp_4",
    },
    {
      name: "Hype Boy",
      artists: ["NewJeans"],
      album: "New Jeans",
      id: "sp_5",
    },
    {
      name: "Kill Bill",
      artists: ["SZA"],
      album: "SOS",
      id: "sp_6",
    },
    {
      name: "As It Was",
      artists: ["Harry Styles"],
      album: "Harry's House",
      id: "sp_7",
    },
  ];

  console.log("Generating multi-year mock data...");

  const years = [2023, 2024, 2025];

  for (const year of years) {
    for (let month = 0; month < 12; month++) {
      console.log(`Seeding ${month + 1}/${year}...`);

      for (let i = 0; i < 50; i++) {
        const weight = Math.pow(Math.random(), 2);
        const trackIndex = Math.floor(weight * tracks.length);
        const track = tracks[trackIndex]!;

        const day = Math.floor(Math.random() * 28) + 1;
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);
        const ms = Math.floor(Math.random() * 1000);

        const playedAt = new Date(year, month, day, hour, minute, second, ms);

        await prisma.listeningHistory.create({
          data: {
            userId: DEV_USER_ID,
            platformName: "spotify",
            platformTrackId: track.id,
            trackName: track.name,
            albumName: track.album,
            durationMs: 180000 + Math.floor(Math.random() * 60000),
            playedAt,
            source: "spotify_api",
            metadata: {},

            artists: {
              connectOrCreate: track.artists.map((artistName) => ({
                where: { name: artistName },
                create: {
                  name: artistName,
                  platformId: `artist_${artistName
                    .toLowerCase()
                    .replace(/\s/g, "_")}`,
                  genres: [],
                  imageUrl: null,
                },
              })),
            },
          },
        });
      }
    }
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
