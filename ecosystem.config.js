module.exports = {
  apps: [
    {
      name: "demoweb-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      }
    },
    {
      name: "demoweb-backend",
      script: "node_modules/tsx/dist/cli.js",
      args: "server/index.ts",
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
