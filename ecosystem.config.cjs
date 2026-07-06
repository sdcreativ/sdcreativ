/** Configuration PM2 — voir docs/DEPLOIEMENT-VPS-HOSTINGER.md */
module.exports = {
  apps: [
    {
      name: "sdcreativ",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
