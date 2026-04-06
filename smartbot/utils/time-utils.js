// Time context and seasonal awareness utilities

export function getTimeContext() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const month = now.getMonth();
  const date = now.getDate();

  let timeOfDay;
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const isWeekend = day === 0 || day === 6;
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
  return { hour, day, dayName, month, date, timeOfDay, isWeekend };
}

export function getTimeGreeting() {
  const ctx = getTimeContext();
  const greetings = {
    morning: ['good morning chat', 'morning yall', 'gm everyone', 'rise and grind chat', 'gm gm', 'wakey wakey chat'],
    afternoon: ['afternoon vibes', 'hope yall having a good day', 'surviving the afternoon?'],
    evening: ['evening chat', 'evening vibes hitting', 'how was everyones day'],
    night: ['late night crew represent', 'night owls gang', 'who else cant sleep lol', 'the real ones are on at this hour'],
  };
  const pool = greetings[ctx.timeOfDay];
  let greeting = pool[Math.floor(Math.random() * pool.length)];
  if (Math.random() < 0.15) {
    const dayComments = {
      Monday: 'monday grind', Tuesday: 'taco tuesday vibes', Wednesday: 'hump day',
      Thursday: 'almost friday', Friday: 'FRIDAY LETS GO', Saturday: 'weekend mode', Sunday: 'sunday chill',
    };
    if (dayComments[ctx.dayName]) greeting += ', ' + dayComments[ctx.dayName];
  }
  return greeting;
}

export function getSeasonalContext() {
  const now = new Date();
  const month = now.getMonth();
  const date = now.getDate();
  const md = `${month + 1}-${date}`;
  const events = {
    '1-1': 'new_year', '2-14': 'valentines', '3-17': 'st_patricks',
    '10-31': 'halloween', '12-25': 'christmas', '12-31': 'new_years_eve',
    '7-4': 'july_4th', '11-11': 'veterans_day',
  };
  if (events[md]) return events[md];
  const tomorrow = new Date(now); tomorrow.setDate(date + 1);
  const mdT = `${tomorrow.getMonth() + 1}-${tomorrow.getDate()}`;
  if (events[mdT]) return `eve_of_${events[mdT]}`;
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

export const SEASONAL_COMMENTS = {
  new_year: ['happy new year chat 🎉', 'new year new us frfr', 'whos already failed their resolution lol'],
  valentines: ['happy valentines day chat ❤️', 'love is in the air or whatever'],
  halloween: ['happy halloween 🎃', 'spooky season vibes', 'trick or treat chat'],
  christmas: ['merry christmas yall 🎄', 'tis the season chat'],
  new_years_eve: ['last day of the year lets gooo'],
  eve_of_christmas: ['christmas tomorrow chat lets gooo 🎄'],
  summer: ['summer vibes hitting different', 'its giving summer energy'],
  fall: ['fall weather is elite honestly', 'cozy season loading'],
  winter: ['its cold out there ngl', 'winter arc activated'],
  spring: ['spring energy is immaculate'],
};
