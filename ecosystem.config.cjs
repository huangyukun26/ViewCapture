module.exports = {
  apps: [
    {
      name: "cityvisionlab-viewcapture",
      script: "server.js",
      args: "--public --production --port 8080",
      cwd: ".",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        CITYVISIONLAB_HARDEN_PUBLIC: "1",
        CORS_ORIGINS:
          "https://cityvisionlab.cn,https://www.cityvisionlab.cn",
        PLATFORM_DATABASE_URL: "",
        PLATFORM_REDIS_URL: "",
        PLATFORM_AI_BASE_URL: "http://127.0.0.1:5000",
        PLATFORM_BOOTSTRAP_ADMIN_USERNAME: "admin",
        PLATFORM_BOOTSTRAP_ADMIN_PASSWORD: "admin12345",
        PLATFORM_COOKIE_SECURE: "1",
      },
    },
  ],
};
