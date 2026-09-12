import * as locks from "./locks";
import * as rateLimits from "./rateLimit";

const workerUtils = { locks, rateLimits };

export default workerUtils;
