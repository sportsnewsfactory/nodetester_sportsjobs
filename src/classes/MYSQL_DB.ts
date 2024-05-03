import {
    createPool,
    FieldPacket,
    OkPacket,
    Pool,
    PoolOptions,
    ResultSetHeader,
    RowDataPacket,
} from 'mysql2/promise';
import { FORMAT } from './FORMAT';

export interface ConditionClause {
    [key: string]: any;
}

export interface JoinClause {
    table: string; // Name of the table to join with
    type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'; // Type of join
    on: string; // Join condition
    columns: string[]; // the columns to be selected from the right table
}

export class MYSQL_DB {
    static config: PoolOptions = {
        user: process.env.DB_USER,
        password: process.env.DB_PWD,
        host: process.env.DB_HOST,
        port: 25060,
        connectionLimit: 10,
        multipleStatements: true,
    } as PoolOptions;

    pool: Pool;

    constructor() {
        this.pool = {} as Pool;
    }
    /**
     * Connect to DB using the config in the static section
     * This version assumes we have several DBs in a given cluster
     */
    createPool() {
        try {
            const config: PoolOptions = {
                ...MYSQL_DB.config,
            };
            this.pool = createPool(config);
            return 'MySql pool generated successfully';
        } catch (e) {
            console.error('Error: ', e);
            throw new Error('failed to initialized pool');
        }
    }
    private async executeQuery(query: string, params: any[]): Promise<any> {
        try {
            return await this.pool.execute(query, params);
        } catch (error) {
            console.error(`Failed to execute query: ${query}`, error);
            throw new Error(`Query execution failed: ${(error as Error).message}`);
        }
    }

    processResult<T>(result: any): T[] {
        if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
            return result[0] as T[];
        } else {
            return [];
        }
    }

    async SELECT<T>(
        tableName: string,
        options?: {
            whereClause?: ConditionClause;
            likeClause?: ConditionClause;
            joinClause?: JoinClause;
        }
    ): Promise<T[]> {
        if (!this.pool) throw new Error('Database connection pool not available.');

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
                console.log(`columns: ${columns}`);
                selectStatement = `SELECT ${tableName}.*, ${columns}\n`;
            }

            // Construct the JOIN clause separately
            let joinClauseSQL = '';

            if (joinClause) {
                joinClauseSQL = `${joinClause.type} JOIN ${joinClause.table} ON ${joinClause.on}`;
                console.log(`joinClause: ${joinClause}`);
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

            console.log(`SQL: ${selectStatement} Params: ${params.join(', ')}`);

            // return [selectStatement, params];
            // Execute the query
            const result = await this.executeQuery(selectStatement, params);
            return this.processResult<T>(result);
        } catch (e) {
            console.error(`Error in SELECT: ${(e as Error).message}`, e);
            throw new Error(`Error in SELECT: ${(e as Error).message}`);
        }
    }
    async UPDATE(
        table: string,
        values: Record<string, any>,
        whereClause: ConditionClause
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

            console.log(`whereClauseSQL`, whereClauseSQL);
            console.log('whereClauseParams', whereClauseParams);

            const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClauseSQL}`;
            const params = [...setParams, ...whereClauseParams];

            console.log(`sql`, sql);
            console.log('params', params);

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
    /**
     * Insert one or more rows into a table
     * and if @param ignore is true, ignore duplicates
     * if @param ignore is false, update duplicates
     * note that when ignore is true this will ignore all errors
     * and could lead to data loss if not used correctly
     */
    async INSERT_BATCH_OVERWRITE<T extends Object>(
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

            // Define the SQL query with multiple rows
            const columns = Object.keys(data[0]).join(', ');
            const updateColumns = Object.keys(data[0])
                .map((col) => `${col}=VALUES(${col})`)
                .join(', ');
            let sql = `INSERT`;
            sql += ignore ? ' IGNORE' : '';
            sql += ` INTO ${tableName} (${columns}) VALUES ${valuePlaceholders}`;
            sql += ignore ? '' : ` ON DUPLICATE KEY UPDATE ${updateColumns}`;
            // Execute the query with all the values
            await this.pool.execute(sql, values);

            console.log('INSERT_BATCH_OVERWRITE: Data inserted successfully.');
            return true;
        } catch (error) {
            throw new Error(`Error in INSERT_BATCH_OVERWRITE:\n\n${error}`);
        }
    }
    /**
     * remove all entries in @param table
     */
    async cleanTable(table: string): Promise<boolean> {
        try {
            if (!this.pool) {
                throw new Error(
                    'Pool was not created. Ensure the pool is created when running the app.'
                );
            }
            const deleteAllRecordsSql = `DELETE FROM ${table};`;
            await this.pool.execute(deleteAllRecordsSql);
            return true;
        } catch (e) {
            throw new Error(`cleanTable failed for table: ${table}: ${e}`);
        }
    }
    /**
     * Remove entried in @param table
     * where the column @param columnName
     * is older than @param targetDate of @type {Date}
     */
    async removeOldEntries(
        table: string,
        targetDate: Date,
        columnName: string
    ) {
        const funcName = `removeOldEntries`;
        // console.log(funcName);
        try {
            const formattedDate = this.formatDateToSQLTimestamp(targetDate);
            const removeOldSqlStatement = `
            DELETE FROM ${table}
            WHERE ${columnName} < '${formattedDate}';
        `;

            await this.pool.execute(removeOldSqlStatement);
        } catch (e) {
            throw new Error(`Error in ${funcName}: ${e}`);
        }
    }
    /**
     * This function is used to insert a single row into a table
     * and return the ID of the inserted row.
     * @param table
     * @param values
     * @returns
     */
    async INSERT_GETID(
        table: string,
        values: { [key: string]: any }
    ): Promise<
        [RowDataPacket[] | RowDataPacket[][] | ResultSetHeader, FieldPacket[]]
    > {
        console.log(`INSERT_GETID`);
        if (!this.pool) {
            throw new Error(
                'Pool was not created. Ensure pool is created when running the app.'
            );
        }

        const [setClause, setParams] = FORMAT.setClause(values);
        const sql = `INSERT INTO ${table} SET ${setClause}`;
        const params = [...setParams];

        // for debuggin we log the simple sql statement
        const plainSql = sql.replace(/\?/g, (match) =>
            typeof params[0] === 'string'
                ? `'${params.shift()}'`
                : params.shift()
        );

        try {
            return await this.pool.execute(plainSql);
        } catch (e) {
            console.error(e);
            throw new Error(`Error in INSERT_GETID`);
        }
    }
    formatDateToSQLTimestamp(date: Date): string {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
}
