import * as schedule from 'node-schedule';
import SERVER_MAIN from './server';

schedule.scheduleJob('*/3 * * * *', SERVER_MAIN);