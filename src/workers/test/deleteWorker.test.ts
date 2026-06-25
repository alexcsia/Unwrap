import prisma from "@/utils/prisma.util";
import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { deleteUserData } from "../deleteWorker";

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
      platformId: crypto.randomUUID(),
    },
  });
}
export async function createHistory(
  userId: string,
  artistIds: string[],
  count: number,
) {
  const histories = [];

  for (let i = 0; i < count; i++) {
    histories.push(
      prisma.listeningHistory.create({
        data: {
          userId,
          platformName: "spotify",
          platformTrackId: crypto.randomUUID(),
          source: "import",
          playedAt: new Date(Date.now() + i),

          trackName: `Track ${i}`,
          albumName: `Album ${i}`,
          durationMs: 200000,
          metadata: {},

          artists: {
            connect: artistIds.map((id) => ({
              id,
            })),
          },
        },
      }),
    );
  }

  await prisma.$transaction(histories);
}

beforeEach(async () => {
  await prisma.user.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.listeningHistory.deleteMany();
});

describe("delete user worker", () => {
  test("deletes all listening history", async () => {
    const user = await createUser();
    const artist = await createArtist(1);

    await createHistory(user.id, [artist.id], 200);

    await deleteUserData(user.id, BATCH_SIZE);

    const count = await prisma.listeningHistory.count({
      where: {
        userId: user.id,
      },
    });

    expect(count).toBe(0);
  });

  test("deletes across multiple batches", async () => {
    const user = await createUser();

    const artist = await createArtist(1);

    await createHistory(user.id, [artist.id], 25);

    const batches: number[] = [];

    await deleteUserData(user.id, 10, (deleted) => batches.push(deleted));

    expect(batches).toEqual([10, 10, 5, 0]);
  });
});

test("does not delete artists", async () => {
  const user = await createUser();

  const artist1 = await createArtist(1);
  const artist2 = await createArtist(2);

  await createHistory(user.id, [artist1.id, artist2.id], 200);

  await deleteUserData(user.id, 10);

  const artists = await prisma.artist.count();

  expect(artists).toBe(2);
});

test("exits gracefully with no history", async () => {
  const user = await createUser();

  const deleted = await deleteUserData(user.id, 100);

  expect(deleted).toBe(0);
});

test("does not delete another users history", async () => {
  const user1 = await createUser();
  const user2 = await createUser();

  const artist = await createArtist(1);

  await createHistory(user1.id, [artist.id], 500);
  await createHistory(user2.id, [artist.id], 500);

  await deleteUserData(user1.id, 50);

  const user1Count = await prisma.listeningHistory.count({
    where: {
      userId: user1.id,
    },
  });

  const user2Count = await prisma.listeningHistory.count({
    where: {
      userId: user2.id,
    },
  });

  expect(user1Count).toBe(0);
  expect(user2Count).toBe(500);
});
