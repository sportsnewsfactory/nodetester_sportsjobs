import fs from 'fs';

/**
 * When the narration files are uploaded to Google Drive,
 * sometimes we'll see the @param folderPath as: 22-09-2024 (1)
 * so we'll see if the folderPath contains parentheses
 * and if it does, we'll search for the folder without the parentheses
 * and move whatever files are in the folder or folders with parentheses 
 * to the folder without parentheses and delete the folders with parentheses
 */
export default function fixGoogleDriveNarrationPathBug(folderPath: string): string {
    const funcName = 'fixGoogleDriveNarrationPathBug';
    let log = '';

    try {
        // check for a folder with parentheses
        for (let i=0; i<10; i++){
            const folderPathWithParentheses = `${folderPath} (${i})`;
            if (!fs.existsSync(folderPathWithParentheses)) continue;

            /**
             * copy files from @param folderPathWithParentheses
             * to @param folderPath
             */
            const files = fs.readdirSync(folderPathWithParentheses);
            for (let j=0; j<files.length; j++){
                const file = files[j];
                fs.renameSync(`${folderPathWithParentheses}/${file}`, `${folderPath}/${file}`);
                log += `Moved file: ${file} from ${folderPathWithParentheses} to ${folderPath}\n`;
            }

            // delete the folder with parentheses
            // fs.rmdirSync(folderPathWithParentheses);
        }

        return log;
    } catch (e) {
        log += `${funcName}: ${e}`;
        return log;
    }
}