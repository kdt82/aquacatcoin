const { DateTime } = require('luxon');

/**
 * Timezone utility functions for Oregon (America/Los_Angeles) server location
 */

const SERVER_TIMEZONE = process.env.COMPETITION_TIMEZONE || 'America/Los_Angeles';

class TimezoneUtils {
  /**
   * Get current time in server timezone
   */
  static now() {
    return DateTime.now().setZone(SERVER_TIMEZONE);
  }

  /**
   * Convert any date to server timezone
   */
  static toServerTime(date) {
    if (!date) return null;
    return DateTime.fromJSDate(date).setZone(SERVER_TIMEZONE);
  }

  /**
   * Get start of day in server timezone
   */
  static startOfDay(date = null) {
    const dt = date ? DateTime.fromJSDate(date).setZone(SERVER_TIMEZONE) : this.now();
    return dt.startOf('day');
  }

  /**
   * Get end of day in server timezone
   */
  static endOfDay(date = null) {
    const dt = date ? DateTime.fromJSDate(date).setZone(SERVER_TIMEZONE) : this.now();
    return dt.endOf('day');
  }

  /**
   * Get start of week (Monday) in server timezone
   */
  static startOfWeek(date = null) {
    const dt = date ? DateTime.fromJSDate(date).setZone(SERVER_TIMEZONE) : this.now();
    return dt.startOf('week'); // Luxon uses Monday as start of week
  }

  /**
   * Get end of week (Sunday) in server timezone
   */
  static endOfWeek(date = null) {
    const dt = date ? DateTime.fromJSDate(date).setZone(SERVER_TIMEZONE) : this.now();
    return dt.endOf('week');
  }

  /**
   * Check if two dates are on the same day in server timezone
   */
  static isSameDay(date1, date2) {
    const dt1 = DateTime.fromJSDate(date1).setZone(SERVER_TIMEZONE);
    const dt2 = DateTime.fromJSDate(date2).setZone(SERVER_TIMEZONE);
    return dt1.hasSame(dt2, 'day');
  }

  /**
   * Check if date is today in server timezone
   */
  static isToday(date) {
    const dt = DateTime.fromJSDate(date).setZone(SERVER_TIMEZONE);
    const now = this.now();
    return dt.hasSame(now, 'day');
  }

  /**
   * Check if date is in current week in server timezone
   */
  static isCurrentWeek(date) {
    const dt = DateTime.fromJSDate(date).setZone(SERVER_TIMEZONE);
    const now = this.now();
    return dt.hasSame(now, 'week');
  }

  /**
   * Get hours since a date in server timezone
   */
  static hoursSince(date) {
    const dt = DateTime.fromJSDate(date).setZone(SERVER_TIMEZONE);
    const now = this.now();
    return now.diff(dt, 'hours').hours;
  }

  /**
   * Check if enough time has passed since last action (for daily bonuses)
   */
  static canClaimDaily(lastClaimDate, hoursRequired = 24) {
    if (!lastClaimDate) return true;
    return this.hoursSince(lastClaimDate) >= hoursRequired;
  }

  /**
   * Get next reset time for daily actions (next day at 00:00 server time)
   */
  static getNextDailyReset() {
    return this.now().plus({ days: 1 }).startOf('day');
  }

  /**
   * Get current competition week boundaries
   */
  static getCurrentCompetitionWeek() {
    const now = this.now();
    const startOfWeek = now.startOf('week'); // Monday 00:00
    const endOfWeek = now.endOf('week');     // Sunday 23:59
    
    return {
      start: startOfWeek.toJSDate(),
      end: endOfWeek.toJSDate(),
      current: now.toJSDate()
    };
  }

  /**
   * Format date for display in server timezone
   */
  static formatForDisplay(date, format = 'yyyy-MM-dd HH:mm:ss ZZZZ') {
    const dt = date ? DateTime.fromJSDate(date).setZone(SERVER_TIMEZONE) : this.now();
    return dt.toFormat(format);
  }

  /**
   * Get timezone info for client display
   */
  static getTimezoneInfo() {
    const now = this.now();
    return {
      timezone: SERVER_TIMEZONE,
      offset: now.toFormat('ZZ'),
      name: now.toFormat('ZZZZ'),
      current: now.toISO(),
      displayName: 'Pacific Time (Oregon)'
    };
  }

  /**
   * Get rate limit reset time (next day at 00:00 server time)
   */
  static getRateLimitReset() {
    return this.getNextDailyReset().toJSDate();
  }

  /**
   * Check if we're in a new day since last action (for rate limit reset)
   */
  static isNewDay(lastActionDate) {
    if (!lastActionDate) return true;
    
    const lastAction = DateTime.fromJSDate(lastActionDate).setZone(SERVER_TIMEZONE);
    const now = this.now();
    
    return !lastAction.hasSame(now, 'day');
  }

  /**
   * Get anonymous rate limit info with Oregon timezone
   */
  static getAnonymousLimitInfo(lastGenerationDate, generationCount) {
    const now = this.now();
    
    // If it's a new day, reset the count
    if (!lastGenerationDate || this.isNewDay(lastGenerationDate)) {
      return {
        used: 0,
        remaining: 3,
        resetTime: this.getRateLimitReset(),
        timezone: this.getTimezoneInfo()
      };
    }
    
    return {
      used: generationCount || 0,
      remaining: Math.max(0, 3 - (generationCount || 0)),
      resetTime: this.getRateLimitReset(),
      timezone: this.getTimezoneInfo()
    };
  }
}

module.exports = TimezoneUtils;
