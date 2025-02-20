import { AE } from "./AE";

export namespace DB {
    export type QARecord = {
        lang: string;
        is_video_uploaded: boolean;
        is_lang_approved: boolean;
        forEdition: Date;
        updated_at: Date;
    };

    export type Lang = {
        lang: string;
        date_format: string;
        allowed_chars: string;
    };

    export type RenderMachine = {
        name: string;
        os: string;
        root_user_name: string;
        drive_path: string;
        local_storage_path: string;
        extensions_path: string;
        qnap_path: string;
        machine_type: string;
        average_edition_rendering_time_in_seconds: number;
    };

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
        | "Football"
        | "Basketball"
        | "Tennis"
        | "Motorsport"
        | "Cricket"
        | "Baseball"
        | "Misc";

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

    export type NextMatch_WithTeamNames = NextMatch & {
        home_team_name: string;
        away_team_name: string;
    };

    export type NextMatch_NewFormat = NextMatch & {
        home_team: string;
        away_team: string;
        date: string;
        time: string;
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
        position: string;
        wins: string;
        losses: string;
        league_season_id: string;
    };

    // export type StandingWinsLosses = StandingAug & {
    //     position: number;
    //     wins: number;
    //     losses: number;
    //     league_season_id: string
    // }

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
        export type Standings = Omit<StandingsBase, "matches" | "points"> & {
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
        export type TransNews = Omit<NewsBase, "id"> & {
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

        export type JoinedNews = News & {
            show_standings: string;
            show_next_matches: string;
            standings_league_season_id: string | null;
            schedule_league_season_id: string | null;
            sport_id: string;
            sport_name: SportName;
            file_name: string;
        };

        export type JoinedNewsTeamsSchedule = JoinedNews & {
            teams: TransTeam[];
            next_matches: NextMatch[];
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

    export namespace Jobs {
        export namespace Mapping {
            export type EditionKey = "presenter";
            export type StandingTextKey =
                | "team_name"
                | "position"
                | "wins"
                | "losses";
            export type ItemTextKey = "headline" | "sub_headline";
            export type ItemFileKey = "narration" | "background" | "logo";
            export type ScheduleKey =
                | "date"
                | "time"
                | "home_team"
                | "away_team";

            export type Scheme = {
                [key in
                    | StandingTextKey
                    | ItemTextKey
                    | ItemFileKey
                    | EditionKey
                    | ScheduleKey]: (...params: any[]) => string;
            };

            export type ContentType = "schedule" | "standings" | "item";
        }

        export type FolderName =
            | "narration"
            | "backgrounds"
            | "logos"
            | "exports"
            | "projects"
            | "projsaves"
            | "presenters";

        export type Folder = {
            name: FolderName;
            relative_path: string;
            root_folder: any;
        };

        export type Edition = {
            brand_name: string;
            active: boolean;
            lang: string;
            presenter_scheme: string;
            export_file_name: string;
            project_file_name: string;
            project_save_file_name: string;
        };

        export type PresenterSchemeRecord = {
            name: string;
            day: string;
            color: string;
            gender: string;
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
