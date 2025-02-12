import * as schedule from 'node-schedule';
import SERVER_MAIN from './server';
import reorganizeTransNews from './DB';

// every three minutes
// schedule.scheduleJob('*/3 * * * *', SERVER_MAIN);

// every day at midnight
schedule.scheduleJob('3 0 * * *', reorganizeTransNews);

//  SERVER_MAIN();
// reorganizeTransNews();CWINZ HI AE_Daily_News failed @ 12/02/2025, 02:09 with error: process__AE_Daily_News: