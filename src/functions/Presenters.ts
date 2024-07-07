import fs from 'fs';
import { Presenter } from '../types/Presenter';
import { DB } from '../types/DB';
import { PRESENTERSCHEMES } from './PRESENTERSCHEMES';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import { CORE } from '../types/CORE';

export function getLongPresenterFileName(
    {lang, isGeneric, part, weekday, color}: Presenter.File): string {
    let fileName = `X_${lang}_${color}`;
    if (isGeneric) fileName += `_Generic`;
    fileName += `_${part}_${weekday}.mp4`;
    return fileName;
}

export function getShortPresenterFileName(
    {lang, part, color}: Presenter.File, version: number | null): string {
    let fileName = `X_${lang}_${color}_${part}`;
    if (version) fileName += `_${version}`;
    fileName += `.mp4`;
    return fileName;
}

export function getPresenterFilesFromFolder(presenterFolderPath: string): string[] {
    try {
        const presenterFolderExists = fs.existsSync(presenterFolderPath);
        if (!presenterFolderExists) throw `No presenter folder found at ${presenterFolderPath}`;
        const files = fs.readdirSync(presenterFolderPath);
        let presenterFiles: string[] = [];
        for (const file of files){
            if (file.toLowerCase().endsWith('.mp4')){
                presenterFiles.push(file);
            }
        }

        return presenterFiles;
    } catch (error) {
        throw `Problem with getPresenterFiles: ${error}`;
    }
}

export type DailyPresenterScheme = {
    open: string,
    close: string
}

export function getPresenterSchemeFiles(
    presenterFolderPath: string, 
    scheme: DB.Jobs.PresenterSchemeRecord,
    lang: string
): DailyPresenterScheme {
    try {
        let presenterFiles: string[] = getPresenterFilesFromFolder(presenterFolderPath);
        let outputPaths: DailyPresenterScheme = {
            open: '',
            close: ''
        };
        
        // firstly, let's filter the files by lang
        // lang is always uppercase, as is the lang in the file name
        // so no need to worry about case sensitivity
        presenterFiles = presenterFiles.filter(file => file.includes(`_${lang}`));
        if (presenterFiles.length === 0) throw `No presenter files found for lang ${lang}`;

        // now let's filter by color
        // @sheme.color is always lowercase, whereas the 
        // first letter of the color in the file name is uppercase
        presenterFiles = presenterFiles.filter(file => file.toLowerCase().includes(`_${scheme.color}`));
        if (presenterFiles.length === 0) throw `No presenter files found for color ${scheme.color}`;

        // console.log(`presenterFiles: ${JSON.stringify(presenterFiles, null, 4)}`);

        // now let's filter by day
        // day is always lowercase, whereas the
        // first letter of the day in the file name is uppercase
        // we store the result in a new variable
        // so that we can default to generic files if no files are found
        // for the closer
        let presenterFilesByDay = presenterFiles.filter(file => file.toLowerCase().includes(`_${scheme.day}`));
        if (presenterFilesByDay.length === 0) throw `presenterFilesByDay: No presenter files found for day ${scheme.day} in folder ${presenterFolderPath}`;

        // now let's filter by gender
        // gender is always lowercase, whereas the
        // first letter of the gender in the file name is uppercase
        presenterFilesByDay = presenterFilesByDay.filter(file => file.toLowerCase().includes(`_${scheme.gender}`));
        if (presenterFilesByDay.length === 0) throw `presenterFilesByDay: No presenter files found for gender ${scheme.gender}`;

        // console.warn(`presenterFilesByDay: ${JSON.stringify(presenterFilesByDay, null, 4)}`);
        // now if all's good we should be left with two or more files
        // and probably only one is an opener
        // so we start with the opener
        let opener = presenterFilesByDay.find(file => file.toLowerCase().includes(`_opener`));
        if (!opener) throw `No opener found for scheme ${JSON.stringify(scheme)} in folder ${presenterFolderPath}`;
        outputPaths.open = `${presenterFolderPath}${opener}`;

        // now let's get the closer
        // for now we default to the first closer we find
        let closer = presenterFilesByDay.find(file => file.toLowerCase().includes(`_closer`));
        if (!closer) {
            closer = presenterFiles.find(file => file.toLowerCase().includes(`_closer`));
            if (!closer) throw `No closer found for scheme ${JSON.stringify(scheme)}`;
        }

        outputPaths.close = `${presenterFolderPath}${closer}`;

        for (const pathKey in outputPaths){
            const path = outputPaths[pathKey as keyof DailyPresenterScheme];
            if (!fs.existsSync(path)) throw `File not found: ${path}`;
        }

        return outputPaths;
    } catch (e) {
        throw `Problem with getPresenterSchemeFiles: ${e}`;
    }
}

export async function getDailyPresenterScheme(
    DB: MYSQL_DB, 
    edition: CORE.Edition, 
    now: Date, 
    presenterFolderPath: string
): Promise<DailyPresenterScheme>{
    try {
        const presenterScheme: DB.Jobs.PresenterSchemeRecord[] = 
            await PRESENTERSCHEMES.getByName(DB, edition.presenter_scheme);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[now.getDay()];

        const todaysPresenterScheme: DB.Jobs.PresenterSchemeRecord | undefined = presenterScheme.find(scheme => scheme.day === dayName.toLowerCase());
        if (!todaysPresenterScheme) throw `No presenter scheme found for day ${dayName}`;

        // console.warn(`todaysPresenterScheme: ${JSON.stringify(todaysPresenterScheme, null, 4)}`);

        const lang: string = edition.lang;
        const scheme: DB.Jobs.PresenterSchemeRecord = todaysPresenterScheme;

        let presenterFiles: string[] = getPresenterFilesFromFolder(presenterFolderPath);
        let dailyPresenterScheme: DailyPresenterScheme = {
            open: '',
            close: ''
        };
        
        // firstly, let's filter the files by lang
        // lang is always uppercase, as is the lang in the file name
        // so no need to worry about case sensitivity
        presenterFiles = presenterFiles.filter(file => file.includes(`_${lang}`));
        if (presenterFiles.length === 0) throw `No presenter files found for lang ${lang}`;

        // now let's filter by color
        // @sheme.color is always lowercase, whereas the 
        // first letter of the color in the file name is uppercase
        presenterFiles = presenterFiles.filter(file => file.toLowerCase().includes(`_${scheme.color}`));
        if (presenterFiles.length === 0) throw `No presenter files found for color ${scheme.color}`;

        // console.log(`presenterFiles: ${JSON.stringify(presenterFiles, null, 4)}`);

        // now let's filter by day
        // day is always lowercase, whereas the
        // first letter of the day in the file name is uppercase
        // we store the result in a new variable
        // so that we can default to generic files if no files are found
        // for the closer
        let presenterFilesByDay = presenterFiles.filter(file => file.toLowerCase().includes(`_${scheme.day}`));
        if (presenterFilesByDay.length === 0) throw `presenterFilesByDay: No presenter files found for day ${scheme.day} in folder ${presenterFolderPath}`;

        // now let's filter by gender
        // gender is always lowercase, whereas the
        // first letter of the gender in the file name is uppercase
        presenterFilesByDay = presenterFilesByDay.filter(file => file.toLowerCase().includes(`_${scheme.gender}`));
        if (presenterFilesByDay.length === 0) throw `presenterFilesByDay: No presenter files found for gender ${scheme.gender}`;

        // console.warn(`presenterFilesByDay: ${JSON.stringify(presenterFilesByDay, null, 4)}`);
        // now if all's good we should be left with two or more files
        // and probably only one is an opener
        // so we start with the opener
        let opener = presenterFilesByDay.find(file => file.toLowerCase().includes(`_opener`));
        if (!opener) throw `No opener found for scheme ${JSON.stringify(scheme)} in folder ${presenterFolderPath}`;
        dailyPresenterScheme.open = `${presenterFolderPath}${opener}`;

        // now let's get the closer
        // for now we default to the first closer we find
        let closer = presenterFilesByDay.find(file => file.toLowerCase().includes(`_closer`));
        if (!closer) {
            closer = presenterFiles.find(file => file.toLowerCase().includes(`_closer`));
            if (!closer) throw `No closer found for scheme ${JSON.stringify(scheme)}`;
        }

        dailyPresenterScheme.close = `${presenterFolderPath}${closer}`;

        for (const pathKey in dailyPresenterScheme){
            const path = dailyPresenterScheme[pathKey as keyof DailyPresenterScheme];
            if (!fs.existsSync(path)) throw `File not found: ${path}`;
        }

        return dailyPresenterScheme;
    } catch (e) {
        throw `Problem with getDailyPresenterScheme: ${e}`;
    }
}