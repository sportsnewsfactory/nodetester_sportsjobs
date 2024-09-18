module.exports = {
  apps: [
    {
      name: 'victor server',
      script: './build/index.js',
      watch: true, // Enable watching for changes
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};