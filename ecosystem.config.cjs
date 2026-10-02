module.exports = {
  apps: [
    {
      name: "api",
      script: "./dist/server.js",
      interpreter: "bun",
    },
    {
      name: "worker",
      script: "./dist/workers/index.js",
      interpreter: "bun",
    },
  ],
};
