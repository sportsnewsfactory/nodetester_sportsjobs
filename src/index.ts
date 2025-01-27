import * as schedule from 'node-schedule';
import SERVER_MAIN from './server';
import reorganizeTransNews from './DB';

// every three minutes
schedule.scheduleJob('*/3 * * * *', SERVER_MAIN);

// every day at midnight
schedule.scheduleJob('1 0 * * *', reorganizeTransNews);

//  SERVER_MAIN();
// reorganizeTransNews();