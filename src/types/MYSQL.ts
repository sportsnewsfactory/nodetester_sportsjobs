export namespace MYSQL {
    export namespace Clause {
        export type Condition = {
            [key: string]: any;
        };
        export type Join = {
            table: string; // Name of the table to join with
            type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'; // Type of join
            on: string; // Join condition
            columns: string[]; // the columns to be selected from the right table
        };
    }
}
