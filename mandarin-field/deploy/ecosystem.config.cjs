module.exports = {
  apps: [{
    name: 'mandarin-field',
    cwd: '/opt/mandarin-field',
    script: 'server/index.mjs',
    env: { NODE_ENV: 'production', PORT: 4310 },
    autorestart: true,
    max_memory_restart: '350M',
  }],
}
