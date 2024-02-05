import { DB } from './DB';

/**
 * Here we'll be defining the data shapes
 * which are composed of data from the DB
 * but are made to be converted into the json
 * data used in the AE extension.
 * Therefor, they contain all the relevant
 * information to do so.
 */
export namespace SportEdition {
    /**
     * This is the mixed sports edition namespace
     * also called GeneralNews
     */
    export namespace Mixed {
        export type Scheme = {
            items: NewsItem[];
        };

        export type NewsItem = {
            meta: {
                id: number; // will be used to index as items are always with ids 1-6
                lang: string;
                when_created: string; //always nice to have
            };
            texts: {
                headline: string; // will be inserted as text
                sub_headline: string; // will be inserted as text
                narration: string; // will sometimes be inserted as text
            };
            footage: {
                background: string; // full path, inserted as file with fitToComp
                logo: string; // full path, inserted as file with fitToComp
            };
            audio: {
                narrationFile: string; // full path, will need to be trimmed
            };
            obj: {
                // if exists will get processed as a separate object
                // which contains only texts
                standings: StandingsItem | null;
            };
        };

        export type StandingsItem = {
            text: {
                leagueSeasonName: string; // will be inserted as text
            };
            rows: StandingsRow[];
        };

        export type StandingsRow = {
            text: DB.StandingsCore & { teamName: string };
        };
    }
}
