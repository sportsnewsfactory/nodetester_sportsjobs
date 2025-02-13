import fs from 'fs';
import { DB } from './types/DB';
import { CORE } from './types/CORE';

type GetBackgroundsAEProps = {
    subFolders: {[key in CORE.Keys.AE.ProductSubFolder]: string}
}

export function getBackgrounds__AE({
    subFolders
}: GetBackgroundsAEProps
): {[key in DB.SportName]: string[] }{
    try {
        const backgroundPaths: {[key in DB.SportName]: string} = {
            Cricket: subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Cricket'),
            Football: subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Football'),
            Tennis: subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Tennis'),
            Motorsport: subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Motorsport'),
            Basketball: subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Basketball'),
            Baseball: '',
            Misc: '',
        }

        for (let sportName in backgroundPaths){
            if (sportName === 'Baseball') continue;
            if (!fs.existsSync(backgroundPaths[sportName as DB.SportName])) 
                throw `Background folder not found: ${backgroundPaths[sportName as DB.SportName]}`;
        }

        let backgrounds: {[key in DB.SportName]: string[]} = 
        {
            Cricket: fs.readdirSync(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Cricket')),
            Football: fs.readdirSync(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Football')),
            Tennis: fs.readdirSync(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Tennis')),
            Motorsport: fs.readdirSync(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Motorsport')),
            Basketball: fs.readdirSync(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Basketball')),
            Baseball: [],
            Misc: [],
        }
        
        for (let sportName in backgrounds){
            if (sportName === 'Baseball') continue;
            let backgroundFiles: string[] = backgrounds[sportName as DB.SportName].filter(
                file => file.endsWith('.mp4')
            );
            if (backgroundFiles.length === 0) throw `No backgrounds found in folder: ${backgroundPaths[sportName as DB.SportName]}`;
            backgrounds[sportName as DB.SportName] = backgroundFiles;
        }

        return backgrounds;
    } catch (e) {
        throw new Error(`getBackgrounds__AE: ${e}`);
    }   
}