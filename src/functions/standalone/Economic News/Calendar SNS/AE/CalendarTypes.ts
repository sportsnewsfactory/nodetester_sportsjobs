export namespace Calendar {
    export namespace Item {
        export type DataSourceKeys = 
        | 'title'
        | 'definition'
        | 'date'
        | 'time'
        | 'previous'
        | 'forecast'
        
        export type OldConventionKey<ItemNum extends number> = 
        | `Wname${ItemNum}`
        | `Wdate${ItemNum}`
        | `Wday${ItemNum}`
        | `Wtime${ItemNum}`
        | `Wprevious${ItemNum}`
        | `Wdescription${ItemNum}`

        /**
         * In FXstreet the data is named: Previous, Consensus and Actual
         * whereas in tradingview it's named: Prior, Forecast and Actual
         * @param T of @type {Num} is the number of the item
         * if the new convention in sports is txt-item1-ranking-team1-team_name
         * or in other words dataType-itemNum-dataCategory-optionalDataSubCategories-dataTitleName
         * our category is economic_calendar so: txt-item1-economic_calendar-title.
         * 
         * The idea is to be able to easily separate the 
         * layer names with a dash
         */
        export type NewConventionKey<ItemNum extends number> =
        | `txt-item${ItemNum}-economic_calendar-title`
        | `txt-item${ItemNum}-economic_calendar-definition`
        | `txt-item${ItemNum}-economic_calendar-date`
        | `txt-item${ItemNum}-economic_calendar-time`
        | `txt-item${ItemNum}-economic_calendar-previous`
        | `txt-item${ItemNum}-economic_calendar-forecast`
    }

    export type DBItem = {
        id: string;
        currencies_list: string; // 'EUR', 'USD', 'JPY', 'GBP', 'AUD'
        title: string;
        defenition: string; // a typo in the DB, map to definition
        dateUtc: string; // convert to date and time
        previous: string;
        countryCode: string; // 'US', 'EU', 'JP', 'AU', 'UK'
        narration: string;
        estimates: string; // need to map to forecast
        updated: string; // SQL timestamp
    }
}