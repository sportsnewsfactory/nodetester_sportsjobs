import { AE } from './AE';
import { RenderMachine, RenderMachinePathKey } from './RenderMachine';

export namespace DB {
    export type TeamBase = {
        id: string;
        name: string;
        sport_name?: SportName;
    };

    export type TransTeam = TeamBase & {
        lang: string;
        translated_name?: string;
    };

    export type AnyPossibleStanding = (
        | DB.StandingsBase
        | DB.Football.Standings
        | DB.Cricket.Standings
        | DB.Basketball.Standings
    ) & { team_name: string };

    export type SportName =
        | 'Football'
        | 'Basketball'
        | 'Tennis'
        | 'Motorsport'
        | 'Cricket'
        | 'Baseball';

    export type Sport = {
        id: string; // needs converting to number
        name: SportName;
    };

    export type NextMatch = {
        id: string;
        tournament_id: string;
        league_season_id: string;
        start_time_timestamp: string;
        start_time_seconds: string;
        slug: string;
        home_team_id: string;
        away_team_id: string;
        sport_name?: SportName;
    };

    export type LeagueSeason = {
        id: string;
        name: string;
        year: string;
        tournament_id: string;
        has_next_matches: boolean;
        has_last_matches: boolean;
        has_standings: boolean;
        has_last_matches_within_last_month: boolean;
    };

    export type StandingsCore = {
        position: string;
        wins: string;
        losses: string;
    };

    export type StandingsBase = StandingsCore & {
        id: string;
        tournament_id: string;
        league_season_id: string;
        team_id: string;
        matches: string;
        points: string;
        when_created: string;
        sport_name?: SportName;
    };

    export type StandingAug = StandingsBase & {
        league_season_name: string;
        team_name: string;
    };

    export namespace Football {
        export type Standings = StandingsBase & {
            draws: string;
            scores_for: string;
            scores_against: string;
        };
    }
    export namespace Cricket {
        export type Standings = StandingsBase & {
            draws: string;
        };
    }

    export namespace Basketball {
        export type Standings = Omit<StandingsBase, 'matches' | 'points'> & {
            streak: string;
            percentage: string;
        };
    }
    export namespace Item {
        export type NewsBase = {
            id: string;
            headline: string;
            sub_headline: string;
            narration: string;
            when_created: string;
        };

        /**
         * We'll be storing the translations in a minimal fassion
         * as the original GeneralNews item contains logo, background, etc.
         * which we don't need to store these per translation.
         */
        export type TransNews = Omit<NewsBase, 'id'> & {
            item_id: string; // references the id of the news item
            //sport_id: string;
            lang: string;
            //league_season_id: string | null;
        };

        export type News = NewsBase & {
            background: string;
            logo: string;
            sport_name?: SportName;
        };

        export type GeneralNews = News & {
            show_standings: string;
            show_next_matches: string;
            league_season_id: string | null;
            sport_id: string;
        };

        export type GeneralNewsWithTeams = GeneralNews & {
            teams: TransTeam[];
        };

        export type TransNewsWithTeams = TransNews & {
            teams: TransTeam[];
            // sport_name?: SportName;
        };
    }

    export namespace File {
        export type Background = {
            file_name: string;
            full_path: string;
            sport_name?: SportName;
        };

        export type Logo = Background;
    }

    // export interface Job {
    //     id?: number; // The '?' denotes that this field is optional (as it's auto-incremented in SQL)
    //     layer_comp_name: string;
    //     markers: string;
    //     layer_comp_type: string;
    //     media_type: string; // 'file', 'text', or 'none'
    //     is_trim: boolean;
    //     is_sync: boolean;
    //     is_marker: boolean;
    //     parent_comp: string;
    // }

    export namespace Jobs {
        export type FolderName =
            | 'narration'
            | 'backgrounds'
            | 'logos'
            | 'exports'
            | 'projects'
            | 'projsaves';

        export type Folder = {
            name: FolderName;
            relative_path: string;
            root_folder: RenderMachinePathKey;
        };

        export type Edition = {
            brand_name: string;
            active: boolean;
            lang: string;
            blueprint: string;
            export_file_name: string;
            project_file_name: string;
            project_save_file_name: string;
        };

        export type Blueprint = {
            name: string;
            description?: string;
            type?: string;
            news_database_name: string;
        };

        export type File = {
            blueprint_name: string;
            source_table_name: string;
            source_column_name: string;
            source_row_formula: string;
            composition_name: string;
            resize_action: string;
        };

        export type Text = {
            blueprint_name: string;
            source_table_name: string;
            source_column_name: string;
            source_row_formula: string;
            text_layer_name: string;
            recursive_insertion: boolean;
            required: boolean;
        };

        export type TS_Sequence = {
            blueprint_name: string;
            method_type: string; // 'trim' or 'sync' or 'marker'
            method_name: string; // 'trimByAudio' or 'trimByVideo' etc
            order_of_execution: number; // 1 will come before 2 obviously

            // for trim
            threshold?: number;
            pad_in?: number;
            pad_out?: number;
            layer_or_comp_name?: string;
            trim_to_layer?: string;
            time?: number;

            // for sync / marker
            padding?: number;
            layer_a_name?: string;
            layer_b_name?: string;
        };
    }
}
