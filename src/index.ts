import * as fs from "fs";
import * as schedule from "node-schedule";
import SERVER_MAIN, { systemBusyFilePath } from "./server";
import reorganizeTransNews from "./DB";

fs.writeFileSync(systemBusyFilePath, "false");

// const customDate = new Date(2025, 1, 24, 1, 0, 0, 0);
const logToConsole = true;
const debugMode = false;
const wastefulMode = true;
// SERVER_MAIN(logToConsole, debugMode, wastefulMode);

// every five minutes


schedule.scheduleJob('*/5 * * * *', () => SERVER_MAIN(logToConsole, debugMode, wastefulMode));

// every day at midnight
// schedule.scheduleJob('3 0 * * *', reorganizeTransNews);

// reorganizeTransNews();
