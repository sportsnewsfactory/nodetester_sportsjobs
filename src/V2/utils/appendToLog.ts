import fs from 'fs';
import path from 'path';

export function appendToLogFile(message: string, logFileName: string): void {
    const wrappedMessage = `${new Date().toLocaleDateString()}: ${message}\n`;

    /**
     * Assuming that this function file is in src/utils
     * and the log folder is in the root of the project
     */
    const logFolderPath = path.resolve(__dirname, '..', '..', 'logs');

    if (!fs.existsSync(logFolderPath))
        throw `appendToLogFile: Path doesn't exist: ${logFolderPath}`;

    const logFilePath = path.resolve(logFolderPath, logFileName);
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, wrappedMessage, 'utf8');
    } else {
        fs.appendFileSync(logFilePath, wrappedMessage, 'utf8');
    }
}
