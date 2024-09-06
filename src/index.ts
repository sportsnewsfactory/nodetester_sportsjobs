import * as schedule from 'node-schedule';
import getTimestamp from './server/functions/get/timestamp';
import fs from 'fs';
import path from 'path';
import { LOG } from './server/functions/log/LOG';
import logFiles from './server/functions/cleanup/res/logFiles';

schedule.scheduleJob('*/2 * * * *', writeDateAndTime);

function writeDateAndTime(){
    LOG.message('Writing date and time to file', 'pink');
    
    const formattedDate = getTimestamp({
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
    .replace(/\//g, '')
    .replace(/:/g, '')
    .replace(/ /g, '-')
    .replace(/,/g, '');

    // Get the current working directory
    const workingDir = process.cwd();

    // Construct the file path
    const filePath = path.join(workingDir, 'logs', `${formattedDate}.txt`);

    fs.writeFileSync(filePath, formattedDate);
}

// logFiles();
// writeDateAndTime();