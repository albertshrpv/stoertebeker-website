module.exports = {
  apps: [
    {
      name: 'stoertebeker-astro',
      script: 'npm',
      args: 'run preview',
      node_args: '--max-old-space-size=6000',
      env: {
        NODE_ENV: 'development'
      },
      env_development: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
