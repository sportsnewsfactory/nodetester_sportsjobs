import { MYSQL_DB } from "../classes/MYSQL_DB";
import { TABLE_NAMES } from "../config/DB_NAMES";
import { DB } from "../types/DB";

export async function getLang(SportsDB: MYSQL_DB, langCode: string): Promise<DB.Lang> {
    try {
        const langs: DB.Lang[] = await SportsDB.SELECT<DB.Lang>(TABLE_NAMES.config.langs)
        let lang = langs.find(l => l.lang === langCode);
        if (!lang) throw `Couldn't find langCode: ${langCode}`;

        const EN = langs.find(l => l.lang === 'EN');
        if (!EN) throw `Couldn't find EN`;

        lang.allowed_chars = langCode === 'EN'
            ? EN.allowed_chars 
            : EN.allowed_chars + lang.allowed_chars;

        return lang;
        
    } catch (e) {
        throw `getLang: ${e}`;
    }
}