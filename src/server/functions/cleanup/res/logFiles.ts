import path from "path";
import fs from "fs";

/**
 * Remove log files from the logs directory
 * that are over 14 days old
 */
export default async function logFiles(days: number = 14){
    // Get the current working directory
    const workingDir = process.cwd();

    // Construct the file path
    const logFolderPath = path.join(workingDir, 'logs');

    const now = new Date();
    const oldDateThreshold = new Date(now.setDate(now.getDate() - days));

    // Get all the files in the logs directory
    const files = fs.readdirSync(logFolderPath);

    // Iterate over the files
    for(const file of files){
        // Construct the file path
        const filePath = path.join(logFolderPath, file);

        // Get the stats of the file
        const stats = fs.statSync(filePath);

        // Check if the file is older than the threshold
        if(stats.mtime < oldDateThreshold){
            // Delete the file
            fs.unlinkSync(filePath);
        }
    }
}