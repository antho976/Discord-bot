/**
 * Time Zone Support - Schedule events in player's local time
 */

class TimeZoneSupport {
  constructor() {
    // Map<playerId, settings>
    this.playerSettings = new Map();

    // Predefined time zones
    this.TIMEZONES = [
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'America/Anchorage', 'Pacific/Honolulu',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
      'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Bangkok',
      'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth',
      'UTC', 'Etc/UTC'
    ];
  }

  /**
   * Initialize player timezone
   */
  initializeTimeZone(playerId, timeZone = 'UTC') {
    this.playerSettings.set(playerId, {
      playerId,
      timeZone,
      enableNotifications: true,
      scheduleOffset: this.getUTCOffset(timeZone)
    });
  }

  /**
   * Get player setting
   */
  getPlayerSettings(playerId) {
    if (!this.playerSettings.has(playerId)) {
      this.initializeTimeZone(playerId);
    }
    return this.playerSettings.get(playerId);
  }

  /**
   * Set player timezone
   */
  setTimeZone(playerId, timeZone) {
    if (!this.TIMEZONES.includes(timeZone)) {
      return { success: false, message: 'Invalid timezone' };
    }

    const settings = this.getPlayerSettings(playerId);
    settings.timeZone = timeZone;
    settings.scheduleOffset = this.getUTCOffset(timeZone);

    return { success: true, message: `Timezone set to ${timeZone}` };
  }

  /**
   * Get UTC offset for timezone
   */
  getUTCOffset(timeZone) {
    const offsets = {
      'America/New_York': -5, // EST / -4 EDT (simplified)
      'America/Chicago': -6,
      'America/Denver': -7,
      'America/Los_Angeles': -8,
      'America/Anchorage': -9,
      'Pacific/Honolulu': -10,
      'Europe/London': 0, // GMT / +1 BST
      'Europe/Paris': 1,
      'Europe/Berlin': 1,
      'Europe/Moscow': 3,
      'Asia/Tokyo': 9,
      'Asia/Shanghai': 8,
      'Asia/Hong_Kong': 8,
      'Asia/Bangkok': 7,
      'Australia/Sydney': 10, // +11 DST
      'Australia/Melbourne': 10,
      'Australia/Perth': 8,
      'UTC': 0,
      'Etc/UTC': 0
    };

    return offsets[timeZone] || 0;
  }

  /**
   * Convert UTC time to player's local time
   */
  convertToPlayerTime(playerId, utcTime = new Date()) {
    const settings = this.getPlayerSettings(playerId);
    const offset = settings.scheduleOffset;

    const playerTime = new Date(utcTime);
    playerTime.setHours(playerTime.getHours() + offset);

    return playerTime;
  }

  /**
   * Schedule event for local player time
   */
  scheduleEventAtLocalTime(playerId, eventName, localHourOfDay) {
    const settings = this.getPlayerSettings(playerId);
    const offset = settings.scheduleOffset;

    // Convert local hour to UTC hour
    const utcHour = (localHourOfDay - offset + 24) % 24;

    return {
      event: eventName,
      localTime: `${localHourOfDay}:00 ${settings.timeZone}`,
      utcTime: `${utcHour}:00 UTC`,
      scheduled: true
    };
  }

  /**
   * Get next event time in player's local time
   */
  getNextEventTime(playerId, eventHourUTC) {
    const settings = this.getPlayerSettings(playerId);
    const offset = settings.scheduleOffset;

    // Convert UTC hour to local hour
    let localHour = (eventHourUTC + offset + 24) % 24;

    const now = new Date();
    const playerNow = this.convertToPlayerTime(playerId, now);

    let eventDate = new Date(playerNow);
    eventDate.setHours(localHour, 0, 0, 0);

    // If event has passed today, schedule for tomorrow
    if (eventDate < playerNow) {
      eventDate.setDate(eventDate.getDate() + 1);
    }

    const hoursUntil = Math.floor((eventDate - playerNow) / (1000 * 60 * 60));
    const minutesUntil = Math.floor(((eventDate - playerNow) % (1000 * 60 * 60)) / (1000 * 60));

    return {
      eventTime: `${localHour}:00 ${settings.timeZone}`,
      nextOccurrence: eventDate.toLocaleString(),
      hoursUntil,
      minutesUntil,
      formatted: `${hoursUntil}h ${minutesUntil}m from now`
    };
  }

  /**
   * Get weekly event schedule
   */
  getWeeklySchedule(playerId, weeklyEvents) {
    const settings = this.getPlayerSettings(playerId);
    const offset = settings.scheduleOffset;

    const schedule = {};

    weeklyEvents.forEach(event => {
      const dayName = event.day;
      const utcHour = event.utcHour;

      const localHour = (utcHour + offset + 24) % 24;

      if (!schedule[dayName]) {
        schedule[dayName] = [];
      }

      schedule[dayName].push({
        name: event.name,
        localTime: `${localHour}:00`,
        utcTime: `${utcHour}:00 UTC`,
        timezone: settings.timeZone
      });
    });

    return {
      timezone: settings.timeZone,
      schedule
    };
  }

  /**
   * Check if it's event time
   */
  isEventTime(playerId, eventHourUTC, bufferMinutes = 0) {
    const settings = this.getPlayerSettings(playerId);
    const offset = settings.scheduleOffset;

    const now = new Date();
    const playerNow = this.convertToPlayerTime(playerId, now);

    const eventLocalHour = (eventHourUTC + offset + 24) % 24;
    const currentHour = playerNow.getHours();

    // Check if within buffer window (e.g., starts 5 min before, ends 5 min after)
    const bufferHours = bufferMinutes / 60;

    return Math.abs(currentHour - eventLocalHour) <= bufferHours ||
           Math.abs(currentHour - eventLocalHour - 24) <= bufferHours ||
           Math.abs(currentHour - eventLocalHour + 24) <= bufferHours;
  }

  /**
   * Get all available timezones
   */
  getAvailableTimeZones() {
    return this.TIMEZONES;
  }

  /**
   * Get timezone by region
   */
  getTimeZonesByRegion(region) {
    const regionMap = {
      'north-america': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage'],
      'hawaii': ['Pacific/Honolulu'],
      'europe': ['Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow'],
      'asia': ['Asia/Tokyo', 'Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Bangkok'],
      'australia': ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth'],
      'utc': ['UTC', 'Etc/UTC']
    };

    return regionMap[region.toLowerCase()] || [];
  }

  /**
   * Get current local time for player
   */
  getCurrentLocalTime(playerId) {
    const settings = this.getPlayerSettings(playerId);
    const now = this.convertToPlayerTime(playerId);

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return {
      timezone: settings.timeZone,
      time: `${hours}:${minutes}:${seconds}`,
      localDate: now.toLocaleDateString(),
      utcOffset: `UTC${settings.scheduleOffset > 0 ? '+' : ''}${settings.scheduleOffset}`
    };
  }
}

export default TimeZoneSupport;
