import {
    createPool,
    FieldPacket,
    OkPacket,
    Pool,
    PoolOptions,
    ResultSetHeader,
    RowDataPacket,
} from 'mysql2/promise';
import { MYSQL } from '../types/MYSQL';
import * as dotenv from 'dotenv';
import { FORMAT } from './FORMAT';
dotenv.config();

export class MYSQL_DB {
    private static config: PoolOptions = {
        user: process.env.DB_USER,
        password: process.env.DB_PWD,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '', 10),
        connectionLimit: parseInt(process.env.CONNECTION_LIMIT || ''),
        multipleStatements: true,
    } as PoolOptions;

    errors: string[];
    pool: Pool;

    constructor() {
        this.pool = {} as Pool;
        this.errors = [];
    }
    /**
     * Connect to DB using the config in the static section
     * This version assumes we have several DBs in a given cluster
     */
    createPool() {
        try {
            // const config: PoolOptions = {
            //     ...MYSQL_DB.config,
            // };
            this.pool = createPool(MYSQL_DB.config);
            return 'MySql pool generated successfully';
        } catch (e) {
            console.error('Error: ', e);
            throw new Error('failed to initialized pool');
        }
    }
    /**
     * The brainless version which accepts very well
     * defined variables and writes the SQL so that
     * there's no room for SQL mistakes. There's a clear
     * separation between SQL and JS. MUCH better...
     * @param tableName
     * @param whereClause
     * @returns
     */
    async SELECT<T>(
        tableName: string,
        options?: {
            whereClause?: MYSQL.Clause.Condition;
            likeClause?: MYSQL.Clause.Condition;
            joinClause?: MYSQL.Clause.Join;
        }
    ): Promise<T[]> {
        if (!this.pool) {
            throw new Error(
                'Pool was not created. Ensure the pool is created when running the app.'
            );
        }

        try {
            const { whereClause, likeClause, joinClause } = options || {};

            const [whereClauseSQL, whereClauseParams] = FORMAT.whereClause(
                tableName,
                whereClause
            );
            const [likeClauseSQL, likeClauseParams] = FORMAT.likeClause(
                tableName,
                likeClause
            );

            let selectStatement = `SELECT * FROM ${tableName}\n`;

            if (joinClause && joinClause.columns) {
                // Add selected columns from the joined table
                const columns = joinClause.columns
                    .map((col: string) => `${joinClause.table}.${col}`)
                    .join(', ');
                //console.log(`columns: ${columns}`);
                selectStatement = `SELECT ${tableName}.*, ${columns}\n`;
            }

            // Construct the JOIN clause separately
            let joinClauseSQL = '';

            if (joinClause) {
                joinClauseSQL = `${joinClause.type} JOIN ${joinClause.table} ON ${joinClause.on}`;
                //console.log(`joinClause: ${joinClause}`);
                // Combine SELECT and JOIN clauses
                selectStatement += `FROM ${tableName}\n${joinClauseSQL}`;
            }

            // Combine WHERE and LIKE clauses
            let whereLikeClauses = '';

            if (whereClauseSQL) {
                whereLikeClauses += whereClauseSQL;
            }

            if (likeClauseSQL) {
                whereLikeClauses +=
                    (whereLikeClauses ? ' AND ' : '') + likeClauseSQL;
            }

            // Add the WHERE clause to the final query
            if (whereLikeClauses) {
                selectStatement += ` WHERE ${whereLikeClauses}`;
            }

            const params = [...whereClauseParams, ...likeClauseParams];

            // console.log(`SQL: ${selectStatement} Params: ${params.join(', ')}`);

            // return [selectStatement, params];
            // Execute the query
            const result = await this.executeQuery(selectStatement, params);
            return this.processResult<T>(result);
        } catch (e) {
            console.warn(`Error in SELECT: ${e}`);
            throw new Error(`Error in SELECT: ${e}`);
        }
    }
    private async executeQuery(query: string, params: any[]) {
        return await this.pool.execute(query + ';', params);
    }
    private processResult<T>(result: any): T[] {
        if (
            Array.isArray(result) &&
            result.length > 0 &&
            Array.isArray(result[0])
        ) {
            return result[0] as T[];
        } else {
            return [];
        }
    }
    /**
     * Here the whereClause is not optional
     */
    async UPDATE(
        table: string,
        values: Record<string, any>,
        whereClause: MYSQL.Clause.Condition
    ): Promise<boolean> {
        if (!this.pool) {
            throw new Error(
                'Pool was not created. Ensure pool is created when running the app.'
            );
        }
        try {
            const [setClause, setParams] = FORMAT.setClause(values);
            const [whereClauseSQL, whereClauseParams] = FORMAT.whereClause(
                table,
                whereClause
            );

            //console.log(`whereClauseSQL`, whereClauseSQL);
            //console.log('whereClauseParams', whereClauseParams);

            const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClauseSQL}`;
            const params = [...setParams, ...whereClauseParams];

            //console.log(`sql`, sql);
            //console.log('params', params);

            const [result] = await this.pool.execute(sql, params);
            return (result as any).affectedRows === 1;
        } catch (e) {
            throw new Error(`Error in UPDATE: ${e}`);
        }
    }
    async INSERT_BATCH<T extends Object>(
        data: T[],
        tableName: string,
        ignore: boolean
    ): Promise<boolean> {
        if (!this.pool) {
            throw new Error(
                'Pool was not created. Ensure the pool is created when running the app.'
            );
        }
        try {
            // Build an array of value placeholders for each data item
            const numKeys = Object.keys(data[0]).length;
            const oneArrayPlaceHolder = `(${Array(numKeys)
                .fill('?')
                .join(', ')})`;
            //console.warn(`Placeholder: ${oneArrayPlaceHolder}`);
            const valuePlaceholders = data
                .map(() => oneArrayPlaceHolder)
                .join(', ');

            // Flatten the data array to create a single array of values
            // const values = data.flatMap((item) => Object.values(item));
            const values = data.flatMap((item) =>
                Object.values(item).map((value) =>
                    value !== undefined ? value : null
                )
            );

            //console.log(`VALUES: ${JSON.stringify(values)}`);

            // Define the SQL query with multiple rows
            const columns = Object.keys(data[0]).join(', ');
            const sql = `INSERT ${
                ignore ? 'IGNORE ' : ''
            }INTO ${tableName} (${columns}) VALUES ${valuePlaceholders}`;

            // Execute the query with all the values
            await this.pool.execute(sql, values);

            //console.log('Data inserted successfully.');
            return true;
        } catch (error) {
            console.error('Error inserting data:', error);
            return false;
        }
    }
    async DELETE(
        table: string,
        whereClause: MYSQL.Clause.Condition
    ): Promise<boolean> {
        if (!this.pool) {
            throw new Error(
                'Pool was not created. Ensure the pool is created when running the app.'
            );
        }

        try {
            const [whereClauseSQL, whereClauseParams] = FORMAT.whereClause(
                table,
                whereClause
            );

            const sql = `DELETE FROM ${table} WHERE ${whereClauseSQL}`;
            const params = [...whereClauseParams];

            const [result] = await this.pool.execute(sql, params);
            return (result as OkPacket).affectedRows > 0;
        } catch (e) {
            throw new Error(`Error in DELETE: ${e}`);
        }
    }
    // async DELETE_ALL(table: string): Promise<boolean> {
    //     if (!this.pool) {
    //         throw new Error(
    //             'Pool was not created. Ensure the pool is created when running the app.'
    //         );
    //     }
    //     try {
    //         const sql = `DELETE FROM ${table};`;

    //         const [result] = await this.pool.execute(sql);
    //         return (result as OkPacket).affectedRows > 0;
    //     } catch (e) {
    //         throw new Error(`Error in DELETE: ${e}`);
    //     }
    // }
}
