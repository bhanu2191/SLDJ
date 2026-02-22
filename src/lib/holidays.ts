import { isHoliday } from 'sl-date-utils-v1';

export type HolidayType = 'Govt' | 'Class' | 'Both' | 'None';

export const isClassHoliday = (date: Date): boolean => {
    const day = date.getDay();
    // Sunday (0), Tuesday (2), Thursday (4)
    return day === 0 || day === 2 || day === 4;
};

export const getHolidayType = (date: Date): HolidayType => {
    const isGovt = isHoliday(date);
    const isClass = isClassHoliday(date);

    if (isGovt && isClass) return 'Both';
    if (isGovt) return 'Govt';
    if (isClass) return 'Class';

    return 'None';
};

export const FIXED_HOLIDAYS = [
    { month: 1, day: 3, name: "Duruthu Full Moon Poya Day" },
    { month: 1, day: 15, name: "Tamil Thai Pongal Day" },
    { month: 2, day: 1, name: "Navam Full Moon Poya Day" },
    { month: 2, day: 4, name: "National Day" },
    { month: 2, day: 15, name: "Maha Sivarathri Day" },
    { month: 3, day: 2, name: "Medin Full Moon Poya Day" },
    { month: 3, day: 21, name: "Eid-ul-Fitr" },
    { month: 4, day: 1, name: "Bak Full Moon Poya Day" },
    { month: 4, day: 3, name: "Good Friday" },
    { month: 4, day: 13, name: "Day Before Sinhala & Tamil New Year" },
    { month: 4, day: 14, name: "Sinhala & Tamil New Year Day" },
    { month: 5, day: 1, name: "Vesak Full Moon Poya Day" },
    // Handle specific day clash for May 1st
    { month: 5, day: 1, name: "International Workers' Day" },
    { month: 5, day: 2, name: "Day Following Vesak Full Moon Poya Day" },
    { month: 5, day: 28, name: "Eid al-Adha" },
    { month: 5, day: 30, name: "Adhi Poson Full Moon Poya Day" },
    { month: 6, day: 29, name: "Poson Full Moon Poya Day" },
    { month: 7, day: 29, name: "Esala Full Moon Poya Day" },
    { month: 8, day: 26, name: "Milad-Un-Nabi" },
    { month: 8, day: 27, name: "Nikini Full Moon Poya Day" },
    { month: 9, day: 26, name: "Binara Full Moon Poya Day" },
    { month: 10, day: 25, name: "Vap Full Moon Poya Day" },
    { month: 11, day: 8, name: "Deepavali Festival Day" },
    { month: 11, day: 24, name: "Il Full Moon Poya Day" },
    { month: 12, day: 23, name: "Unduvap Full Moon Poya Day" },
    { month: 12, day: 25, name: "Christmas Day" }
];

export const getHolidayName = (date: Date): string | null => {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // In Sri Lanka, May 1st represents both. Returning combined string if it hits a duplicate.
    const matchingHolidays = FIXED_HOLIDAYS.filter(h => h.month === month && h.day === day);

    if (matchingHolidays.length > 0) {
        return matchingHolidays.map(h => h.name).join(' & ');
    }

    return null;
};
