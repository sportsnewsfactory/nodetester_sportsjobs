//return the location inside text where there's a month name or day and null if there's none

function forMonth(text: string) {
    let lowerCased = text.toLowerCase();
    let fullMonthNames = [
        'january',
        'february',
        'march',
        'april',
        'may',
        'june',
        'july',
        'august',
        'september',
        'october',
        'november',
        'december',
    ];
    let shortMonthNames = [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
    ];
    for (let i = 0; i < fullMonthNames.length; i++) {
        if (lowerCased.indexOf(fullMonthNames[i]) > -1) {
            return i;
        }
    }
    for (let i = 0; i < shortMonthNames.length; i++) {
        if (lowerCased.indexOf(shortMonthNames[i]) > -1) {
            return i;
        }
    }
    return -1;
}

function forDay(text: string) {
    let num = text.match(/[0-9]+/g);
    return Number(num);
}

export { forMonth, forDay };
