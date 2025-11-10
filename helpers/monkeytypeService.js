"use strict";
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

/**
 * Get the dates for display based on settings
 * @param {boolean} asISOString - Whether to return dates as ISO strings or Date objects
 * @param {boolean} showCurrentWeekOnly - Whether to show only the current week
 * @param {number} weekStartDay - Day the week starts on (0 = Sunday, 1 = Monday, etc.)
 * @param {number} daysToShow - Number of days to show (1-7)
 * @returns {(string[]|Date[])} Array of dates in the requested format
 */
export function getDates(asISOString = true, showCurrentWeekOnly = false, weekStartDay = 1, daysToShow = 7) {
    const dates = [];
    const today = new Date();

    if (showCurrentWeekOnly) {
        const currentDay = today.getDay();
        let daysToSubtract = currentDay - weekStartDay;
        if (daysToSubtract < 0) daysToSubtract += 7;

        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - daysToSubtract);

        for (let i = 0; i < daysToShow; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);

            if (asISOString) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dates.push(`${year}-${month}-${day}`);
            } else {
                dates.push(d);
            }
        }
    } else {
        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);

            if (asISOString) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dates.push(`${year}-${month}-${day}`);
            } else {
                dates.push(d);
            }
        }
    }

    return dates;
}

/**
 * Fetch typing activity from Monkeytype API
 * @param {string} username - Monkeytype username
 * @param {string} apeKey - Monkeytype ApeKey for authentication (optional)
 * @param {boolean} showCurrentWeekOnly - Whether to show current week only
 * @param {number} weekStartDay - Day the week starts on
 * @param {number} daysToShow - Number of days to show (1-7)
 * @returns {Promise<number[]|Object>} Array of test counts for each day, or object with streak info
 */
export async function fetchTypingActivity(username, apeKey, showCurrentWeekOnly = false, weekStartDay = 1, daysToShow = 7) {
    if (!username || username === 'YOUR_MONKEYTYPE_USERNAME') {
        console.error('Monkeytype Streak Extension: Monkeytype username is not configured.');
        return Array(daysToShow).fill(0);
    }

    console.log(`Monkeytype Streak Extension: Username: ${username}, ApeKey provided: ${!!apeKey && apeKey !== 'YOUR_MONKEYTYPE_APE_KEY' && apeKey.trim() !== ''}`);

    // If no ApeKey, fall back to public profile for streak data
    if (!apeKey || apeKey === 'YOUR_MONKEYTYPE_APE_KEY' || apeKey.trim() === '') {
        console.log('Monkeytype Streak Extension: No ApeKey provided, fetching public streak data...');
        return await fetchPublicStreak(username);
    }

    const targetDates = getDates(true, showCurrentWeekOnly, weekStartDay, daysToShow);

    try {
        // First, try to get the user's profile which includes testActivity
        const session = new Soup.Session();
        const message = Soup.Message.new('GET', `https://api.monkeytype.com/users/${username}/profile`);
        
        if (!message) {
            throw new Error('Failed to create Soup.Message');
        }

        message.request_headers.append('Authorization', `ApeKey ${apeKey}`);
        message.request_headers.append('User-Agent', 'GNOME Shell Extension Monkeytype Streak');

        let responseBytes;
        try {
            responseBytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        } catch (e) {
            console.error(`Monkeytype Streak Extension: Network error - ${e.message}`);
            throw e;
        }

        const responseStr = new TextDecoder().decode(responseBytes.get_data());
        const result = JSON.parse(responseStr);

        if (!result.data) {
            console.error('Monkeytype Streak Extension: Unexpected API response structure:', result);
            throw new Error('Unexpected API response structure.');
        }

        const profileData = result.data;

        // Check if testActivity is available in the profile
        if (profileData.testActivity) {
            return parseTestActivity(profileData.testActivity, targetDates);
        }

        // If testActivity is not in profile, we need to use the authenticated endpoint
        // GET /users/currentTestActivity (requires authentication)
        const activityMessage = Soup.Message.new('GET', 'https://api.monkeytype.com/users/currentTestActivity');
        
        if (!activityMessage) {
            throw new Error('Failed to create Soup.Message for test activity');
        }

        activityMessage.request_headers.append('Authorization', `ApeKey ${apeKey}`);
        activityMessage.request_headers.append('User-Agent', 'GNOME Shell Extension Monkeytype Streak');

        let activityResponseBytes;
        try {
            activityResponseBytes = await session.send_and_read_async(activityMessage, GLib.PRIORITY_DEFAULT, null);
        } catch (e) {
            console.error(`Monkeytype Streak Extension: Network error fetching activity - ${e.message}`);
            throw e;
        }

        const activityResponseStr = new TextDecoder().decode(activityResponseBytes.get_data());
        const activityResult = JSON.parse(activityResponseStr);

        if (!activityResult.data) {
            console.error('Monkeytype Streak Extension: No activity data received');
            throw new Error('No activity data received.');
        }

        return parseTestActivity(activityResult.data, targetDates);

    } catch (e) {
        console.error(`Monkeytype Streak Extension: Error fetching typing activity - ${e.message}`);
        return Array(daysToShow).fill(0);
    }
}

/**
 * Fetch public streak data from Monkeytype API (no authentication required)
 * @param {string} username - Monkeytype username
 * @returns {Promise<Object>} Object with streak and maxStreak
 */
async function fetchPublicStreak(username) {
    try {
        const session = new Soup.Session();
        const message = Soup.Message.new('GET', `https://api.monkeytype.com/users/${username}/profile`);
        
        if (!message) {
            throw new Error('Failed to create Soup.Message');
        }

        message.request_headers.append('User-Agent', 'GNOME Shell Extension Monkeytype Streak');

        let responseBytes;
        try {
            responseBytes = await session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        } catch (e) {
            console.error(`Monkeytype Streak Extension: Network error - ${e.message}`);
            throw e;
        }

        const responseStr = new TextDecoder().decode(responseBytes.get_data());
        const result = JSON.parse(responseStr);

        if (!result.data) {
            console.error('Monkeytype Streak Extension: Unexpected API response structure:', result);
            throw new Error('Unexpected API response structure.');
        }

        const { streak, maxStreak } = result.data;

        return {
            isStreakOnly: true,
            streak: streak || 0,
            maxStreak: maxStreak || 0
        };

    } catch (e) {
        console.error(`Monkeytype Streak Extension: Error fetching public streak - ${e.message}`);
        return {
            isStreakOnly: true,
            streak: 0,
            maxStreak: 0
        };
    }
}

/**
 * Parse test activity data and extract counts for target dates
 * @param {Object} testActivity - Test activity data from API
 * @param {string[]} targetDates - Array of target dates in ISO format
 * @returns {number[]} Array of test counts for each target date
 */
function parseTestActivity(testActivity, targetDates) {
    // testActivity structure from API:
    // { testsByDays: [count1, count2, ...], lastDay: timestamp }
    // The array contains test counts, with the last element being the most recent day
    
    if (!testActivity.testsByDays || !Array.isArray(testActivity.testsByDays)) {
        console.error('Monkeytype Streak Extension: Invalid testActivity structure');
        return Array(7).fill(0);
    }

    const testsByDays = testActivity.testsByDays;
    const lastDayTimestamp = testActivity.lastDay;

    // Convert lastDay timestamp to date
    const lastDay = new Date(lastDayTimestamp);
    
    // Create a map of dates to test counts
    const activityMap = new Map();
    
    // Work backwards from the last day
    for (let i = testsByDays.length - 1; i >= 0; i--) {
        const date = new Date(lastDay);
        date.setDate(lastDay.getDate() - (testsByDays.length - 1 - i));
        
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        activityMap.set(dateStr, testsByDays[i] || 0);
    }

    // Map target dates to test counts
    return targetDates.map(date => activityMap.get(date) || 0);
}
