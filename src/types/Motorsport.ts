export namespace Motorsport {
    export namespace Standings {
        export type Entry = {
            position: string;
            team_name: string;
            points: string;
            league_season_name: string;
            league_season_id: string;
        };
        export type List = {
            header?: string;
            sub_header?: string;
            entries: Entry[];
        };
    }
    export namespace Schedule {
        export type Event = {
            league_season_id: string;
            league_season_name: string;
            slug: string;
            description: string;
            start_date_seconds: number;
            start_date_timestamp: string;
        }

        export type List = {
            header?: string;
            sub_header?: string;
            events: Event[];
        }
    }
}