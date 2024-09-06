import { CWINZ_AE_SNS_TEST } from "./functions/CWINZ/CWINZ_AE_SNS_TEST";
import { CWINZ_AE_daily_news__MIXED_EN } from "./functions/R2R/CWINZ_AEDailyNews EN MixedSports";
import { Race2Real_AE_daily_news__MOTORSPORT_EN } from "./functions/R2R/race2real_AEdailyNews EN MOTORSPORT";
import MAIN from "./server";
import * as schedule from 'node-schedule';

// Race2Real_AE_daily_news__MOTORSPORT_EN();
// CWINZ_AE_daily_news__MIXED_EN();
// CWINZ_AE_SNS_TEST();

schedule.scheduleJob('*/3 * * * *', MAIN);
// MAIN();
// getNextJob();