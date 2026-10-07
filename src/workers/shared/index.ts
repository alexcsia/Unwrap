import { locks } from "./locks";
import { rateLimits } from "./rateLimit";

const workerUtils = {
  locks,
  rateLimits,
};

export default workerUtils;

export type WorkerUtils = typeof workerUtils;
