import { MYSQL } from "../types/MYSQL";
import { MYSQL_DB } from "./MYSQL_DB";
import { runFunctionWithRetry } from "./runFuncitonWithRetry";

export namespace Helper {
    export interface Select {
        DB: MYSQL_DB;
        funcName: string;
        tableName: string;
        joinClause?: MYSQL.Clause.Join;
        whereClause?: MYSQL.Clause.Condition;
        likeClause?: MYSQL.Clause.Condition;
    }

    export interface Update {
        DB: MYSQL_DB;
        funcName: string;
        tableName: string;
        values: { [key: string]: any };
        whereClause: MYSQL.Clause.Condition;
    }

    export interface Delete {
        DB: MYSQL_DB;
        funcName: string;
        tableName: string;
        whereClause: MYSQL.Clause.Condition;
    }
}

export const HELPER = {
    async select<T extends any>({
        DB,
        funcName,
        tableName,
        joinClause,
        whereClause,
        likeClause,
    }: Helper.Select): Promise<T[]> {
        try {
            const options = {
                whereClause,
                likeClause,
                joinClause,
            };
            const fn = () => DB.SELECT<T>(tableName, options);
            const result = await runFunctionWithRetry(fn, 5);
            return result;
        } catch (error) {
            throw `Error @ ${funcName}: ${error}`;
        }
    },
    async update({
        DB,
        funcName,
        tableName,
        values,
        whereClause,
    }: Helper.Update): Promise<boolean> {
        try {
            const fn = () => DB.UPDATE(tableName, values, whereClause);
            const result = await runFunctionWithRetry(fn, 5);
            return result;
        } catch (error) {
            throw `Error @ ${funcName}: ${error}`;
        }
    },
    async delete({
        DB,
        funcName,
        tableName,
        whereClause,
    }: Helper.Delete): Promise<boolean> {
        try {
            const fn = () => DB.DELETE(tableName, whereClause);
            const result = await runFunctionWithRetry(fn, 5);
            return result;
        } catch (error) {
            throw `Error @ ${funcName}: ${error}`;
        }
    },
};
