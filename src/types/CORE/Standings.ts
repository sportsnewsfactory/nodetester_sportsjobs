export namespace Standings {
    export type Entry = {[key: string]: string};
    export type List = {
        header?: string;
        entries: Entry[];
    }
}