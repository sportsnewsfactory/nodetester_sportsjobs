-   pm2 start pm2.config.js
    make sure you have watch: true in there. See pm2.config.js

-   pm2 save
    [PM2] Saving current process list...
    [PM2] Successfully saved in C:\Users\NF5\.pm2\dump.pm2

-   create a startup task in windows scheduler for pm2.bat
    name it some descriptive name like "pm2 startup"
    give it highest permissions and set trigger for on log in

-   example of pm2.config.js:

    module.exports = {
    apps: [
    {
    name: 'victor server v1.0.0',
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
