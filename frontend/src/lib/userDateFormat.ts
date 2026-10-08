import type { UserPreferences } from '../types';

export function formatUserDate(value: string, preferences: UserPreferences, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: preferences.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const year = values.year || '';
  const month = values.month || '';
  const day = values.day || '';
  let formattedDate: string;

  if (preferences.dateFormat === 'yyyy-MM-dd') {
    formattedDate = `${year}-${month}-${day}`;
  } else if (preferences.dateFormat === 'dd/MM/yyyy') {
    formattedDate = `${day}/${month}/${year}`;
  } else {
    formattedDate = new Intl.DateTimeFormat('id-ID', {
      timeZone: preferences.timeZone,
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }

  if (!includeTime) return formattedDate;
  const time = new Intl.DateTimeFormat('id-ID', {
    timeZone: preferences.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date);
  return `${formattedDate}, ${time}`;
}
