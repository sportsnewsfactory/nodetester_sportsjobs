import { DB } from "../../types/DB";

// Define types for optional parameters specific to standings and schedules
export type StandingsOptions = {
    rowNum?: number;
    attribute?: DB.Jobs.Mapping.StandingTextKey // 'team_name' | 'position' | 'wins' | 'losses';
};

export type ScheduleOptions = {
    matchNum?: number;
    attribute?: DB.Jobs.Mapping.ScheduleKey // 'date' | 'time' | 'home_team' | 'away_team';
};

export function generateLayerName(type: string, itemNum: number, contentType: DB.Jobs.Mapping.ContentType, standingsOpts?: StandingsOptions, scheduleOpts?: ScheduleOptions): string {
    let baseName = `${type}-item${itemNum}`;

    if (contentType === 'standings' && standingsOpts) {
        if (standingsOpts.rowNum !== undefined) {
            baseName += `-ranking-row${standingsOpts.rowNum}`;
            if (standingsOpts.attribute) {
                baseName += `-${standingsOpts.attribute}`;
            }
        } else {
            baseName += `-ranking-header`; // No rowNum implies it's the header
        }
    } else if (contentType === 'schedule' && scheduleOpts) {
        if (scheduleOpts.matchNum !== undefined) {
            baseName += `-schedule-match${scheduleOpts.matchNum}`;
            if (scheduleOpts.attribute) {
                baseName += `-${scheduleOpts.attribute}`;
            }
        }
    }

    return baseName;
}
