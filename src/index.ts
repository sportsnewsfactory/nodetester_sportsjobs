import * as schedule from "node-schedule";
import SERVER_MAIN from "./server";
import reorganizeTransNews from "./DB";

const customDate = new Date(2025, 1, 24, 1, 0, 0, 0);
const logToConsole = true;
const debugMode = true;
const wastefulMode = true;
SERVER_MAIN(logToConsole, debugMode, wastefulMode, customDate);

// every three minutes
// schedule.scheduleJob('*/10 * * * *', () => SERVER_MAIN(true));

// every day at midnight
// schedule.scheduleJob('3 0 * * *', reorganizeTransNews);

// reorganizeTransNews();
