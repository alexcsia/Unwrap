import { getHistoryHandlers } from "./platformRegistry";

export const getHistoryService = async (user: any, platform: string) => {
  const handler =
    getHistoryHandlers[platform as keyof typeof getHistoryHandlers];

  await handler(user);
};
