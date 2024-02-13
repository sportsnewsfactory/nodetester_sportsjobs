export namespace Presenter {
    export type Color = 'RED' | 'BLACK' | 'BEIGE';
    export type DayName = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    export type Lang = 'HI' | 'EN';
    export type Part = 'opener' | 'closer';
    export type Gender = 'Male' | 'Female';
    export type File = {
        color: Color;
        lang: Lang;
        gender: Gender;
        part: Part;
        isGeneric: boolean;
        weekday: DayName | null;
    }
}