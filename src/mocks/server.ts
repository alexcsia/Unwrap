import { setupServer } from "msw/node";
import { spotifyHandlers } from "./spotifyHandlers";

export const server = setupServer(...spotifyHandlers);
