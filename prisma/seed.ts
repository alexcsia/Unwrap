import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const DEV_USER_ID = "1234";

async function main() {
  console.log("Cleaning database...");
  await Promise.all([
    prisma.listeningHistory.deleteMany(),
    prisma.internalAuthSessions.deleteMany(),
    prisma.connectedPlatforms.deleteMany(),
    prisma.user.deleteMany(),
  ]);

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
      artist: "Taylor Swift",
      album: "Lover",
      id: "sp_1",
    },
    {
      name: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      id: "sp_2",
    },
    {
      name: "Flowers",
      artist: "Miley Cyrus",
      album: "Endless Summer",
      id: "sp_3",
    },
    {
      name: "Anti-Hero",
      artist: "Taylor Swift",
      album: "Midnights",
      id: "sp_4",
    },
    {
      name: "As It Was",
      artist: "Harry Styles",
      album: "Harry's House",
      id: "sp_5",
    },
    { name: "Hype Boy", artist: "NewJeans", album: "New Jeans", id: "sp_6" },
    { name: "Kill Bill", artist: "SZA", album: "SOS", id: "sp_7" },
    {
      name: "Creepin'",
      artist: "Metro Boomin",
      album: "Heroes & Villains",
      id: "sp_8",
    },
    { name: "Stay", artist: "The Kid LAROI", album: "F*ck Love 3", id: "sp_9" },
    {
      name: "Heat Waves",
      artist: "Glass Animals",
      album: "Dreamland",
      id: "sp_10",
    },
  ];

  console.log("Generating multi-year mock data...");
  const mockPlays = [];
  const years = [2023, 2024, 2025];

  for (const year of years) {
    for (let month = 0; month < 12; month++) {
      // Create ~40 plays per month to ensure pagination works (limit 10)
      for (let i = 0; i < 40; i++) {
        // Weighted selection: Songs at the start of the array appear more often
        const weight = Math.pow(Math.random(), 2);
        const trackIndex = Math.floor(weight * tracks.length);
        const track = tracks[trackIndex]!;

        const day = Math.floor(Math.random() * 28) + 1;
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);

        const playedAt = new Date(year, month, day, hour, minute);

        mockPlays.push({
          userId: DEV_USER_ID,
          platformName: "spotify",
          platformTrackId: track.id,
          trackName: track.name,
          artistName: track.artist,
          albumName: track.album,
          durationMs: 180000 + Math.floor(Math.random() * 60000),
          playedAt,
          source: "spotify_api",
          metadata: {},
        });
      }
    }
  }

  // Use a transaction or chunking if the array gets massive (> 10,000)
  await prisma.listeningHistory.createMany({
    data: mockPlays,
    skipDuplicates: true,
  });

  console.log(
    `Seed complete! Created ${mockPlays.length} plays across 3 years.`,
  );
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
