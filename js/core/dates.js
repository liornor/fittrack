// Calendar dates are stored as local "YYYY-MM-DD" strings.
// Never use toISOString() for these: it converts to UTC, so a workout logged
// late in the evening would land on the next day.
(function (FT) {
  'use strict';

  function pad(n) { return String(n).padStart(2, '0'); }

  function toLocalDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function today() { return toLocalDate(new Date()); }

  function parse(dateString) {
    const [y, m, d] = dateString.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function isValid(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && toLocalDate(parse(value)) === value;
  }

  // Whole calendar days from a to b (Math.round absorbs daylight-saving hours).
  function daysBetween(a, b) {
    return Math.round((parse(b) - parse(a)) / 86400000);
  }

  function format(dateString) {
    const date = parse(dateString);
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    if (date.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
    return date.toLocaleDateString(undefined, options);
  }

  function relative(dateString) {
    const diff = daysBetween(dateString, today());
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return format(dateString);
  }

  function monthLabel(dateString) {
    return parse(dateString).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  FT.dates = { today, toLocalDate, parse, isValid, daysBetween, format, relative, monthLabel };
})(window.FitTrack = window.FitTrack || {});
