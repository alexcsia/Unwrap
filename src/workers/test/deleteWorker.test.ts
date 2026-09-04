import prisma from "@/utils/prisma.util";
import { beforeEach, describe, expect, test } from "bun:test";
import { deleteUserData } from "../deleteWorker";

console.log(Object.keys(prisma));
const BATCH_SIZE = 20;

export async function createUser() {
  return prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@test.com`,
      displayName: "test",
      passwordHash: "hash",
    },
  });
}

export async function createArtist(index: number) {
  return prisma.artist.create({
    data: {
      name: `Artist ${index}`,
    },
  });
}

export async function createTrack(index: number) {
  return prisma.track.create({
    data: {
      trackName: `Track ${index}`,
      albumName: `Album ${index}`,
      durationMs: 200000,
      platformTracks: {
        create: {
          platformName: "spotify",
          platformTrackId: crypto.randomUUID(),
        },
      },
    },
  });
}

export async function createHistory(
  userId: string,
  trackId: string,
  count: number,
) {
  const histories = [];

  for (let i = 0; i < count; i++) {
    histories.push(
      prisma.listeningHistory.create({
        data: {
          userId,
          trackId,
          platformName: "spotify",
          source: "import",
          playedAt: new Date(Date.now() + i),
        },
      }),
    );
  }

  await prisma.$transaction(histories);
}

beforeEach(async () => {
  await prisma.listeningHistory.deleteMany();
  await prisma.platformTrack.deleteMany();
  await prisma.platformArtist.deleteMany();
  await prisma.track.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.user.deleteMany();
});

describe("delete user worker", () => {
  test("deletes all listening history", async () => {
    const user = await createUser();
    const track = await createTrack(1);
    await createHistory(user.id, track.id, 200);
    await deleteUserData(user.id, BATCH_SIZE);

    const count = await prisma.listeningHistory.count({
      where: { userId: user.id },
    });

    expect(count).toBe(0);
  });

  test("deletes across multiple batches", async () => {
    const user = await createUser();
    const track = await createTrack(1);
    await createHistory(user.id, track.id, 25);

    const batches: number[] = [];
    await deleteUserData(user.id, 10, (deleted) => batches.push(deleted));

    expect(batches).toEqual([10, 10, 5, 0]);
  });

  test("does not delete tracks", async () => {
    const user = await createUser();
    const track1 = await createTrack(1);
    const track2 = await createTrack(2);

    await createHistory(user.id, track1.id, 10);
    await createHistory(user.id, track2.id, 10);
    await deleteUserData(user.id, 10);

    const tracks = await prisma.track.count();

    expect(tracks).toBe(2);
  });

  test("exits gracefully with no history", async () => {
    const user = await createUser();
    const deleted = await deleteUserData(user.id, 100);

    expect(deleted).toBe(0);
  });

  test("does not delete another users history", async () => {
    const user1 = await createUser();
    const user2 = await createUser();
    const track = await createTrack(1);

    await createHistory(user1.id, track.id, 500);
    await createHistory(user2.id, track.id, 500);

    await deleteUserData(user1.id, 50);

    const user1Count = await prisma.listeningHistory.count({
      where: { userId: user1.id },
    });
    const user2Count = await prisma.listeningHistory.count({
      where: { userId: user2.id },
    });

    expect(user1Count).toBe(0);
    expect(user2Count).toBe(500);
  });
});
