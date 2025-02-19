import * as schedule from 'node-schedule';
import SERVER_MAIN from './server';
import reorganizeTransNews from './DB';

// every three minutes
// schedule.scheduleJob('*/3 * * * *', () => SERVER_MAIN(true));

// every day at midnight
// schedule.scheduleJob('3 0 * * *', reorganizeTransNews);

 SERVER_MAIN(true);
// reorganizeTransNews();