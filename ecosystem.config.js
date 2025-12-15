const path = require('path');

// Obtener el directorio base del proyecto (donde está este archivo)
const projectRoot = __dirname;

module.exports = {
  apps: [
    {
      name: 'panaderia-api',
      script: path.join(projectRoot, 'api', 'dist', 'main.js'),
      cwd: projectRoot,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: path.join(projectRoot, 'logs', 'api-error.log'),
      out_file: path.join(projectRoot, 'logs', 'api-out.log'),
      log_file: path.join(projectRoot, 'logs', 'api-combined.log'),
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'panaderia-frontend',
      script: 'npm',
      args: 'start',
      cwd: path.join(projectRoot, 'frontend'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: path.join(projectRoot, 'logs', 'frontend-error.log'),
      out_file: path.join(projectRoot, 'logs', 'frontend-out.log'),
      log_file: path.join(projectRoot, 'logs', 'frontend-combined.log'),
      time: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};

