import fs from 'fs';
import path from 'path';
import getTimestamp from '../get/timestamp';
import { logsFolderPath } from '../../../constants/logsFolderPath';

export default function writeFinalLog(log: string){
    // get date in format: ddmmyy-hhmm
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

    const hasError = log.toLowerCase().includes('error');

    // Get the current working directory
    // const workingDir = process.cwd();

    // Construct the file path
    // const filePath = path.join(workingDir, 'logs', formattedDate, `${hasError && ' err'}.txt`);
    const filePath = path.join(logsFolderPath, `${formattedDate}${hasError ? 'err' : ''}.txt`);
    fs.writeFileSync(filePath, log);
}