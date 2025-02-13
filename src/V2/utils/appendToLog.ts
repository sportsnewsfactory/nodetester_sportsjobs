import fs from 'fs';
import path from 'path';
import { TimeDeltas } from '../classes/TimeDeltas';

type ColorName =
    | 'yellow'
    | 'green'
    | 'orange'
    | 'cyan'
    | 'white'
    | 'blue'
    | 'pink'
    | 'magenta'
    | 'red';

export function appendToLogFile(
    TD: TimeDeltas,
    message: string,
    logFileName: string,
    logToConsole: boolean = true,
    color?: ColorName
): void {
    const wrappedMessage = `${TD.formatYYYYMMDDhhmmss(
        new Date()
    )}: ${message}\n`;

    if (logToConsole) {
        if (color) {
            console.log(`%c${message}`, `color: ${color}`);
        }
    }

    /**
     * Assuming that this function file is in src/utils
     * and the log folder is in the root of the project
     */
    const logFolderPath = path.resolve(__dirname, '..', '..', '..', 'logs');

    if (!fs.existsSync(logFolderPath))
        throw `appendToLogFile: Path doesn't exist: ${logFolderPath}`;

    const logFilePath = path.resolve(logFolderPath, logFileName);
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, wrappedMessage, 'utf8');
    } else {
        fs.appendFileSync(logFilePath, wrappedMessage, 'utf8');
    }
}
