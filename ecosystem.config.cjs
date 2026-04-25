module.exports = {
  apps: [
    {
      name: "api",
      script: "./dist/app.js",
      interpreter: "bun",
    },
    {
      name: "worker",
      script: "./dist/workers/index.js",
      interpreter: "bun",
    },
  ],
};
