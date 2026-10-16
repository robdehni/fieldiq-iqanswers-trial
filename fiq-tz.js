/* ============================================================
   FieldIQ canonical timezone helper — Stage 0
   ------------------------------------------------------------
   One source of truth for business-day boundaries across every
   FieldIQ surface. IANA zone names only, never fixed offsets,
   so DST countries resolve correctly.

   Storage rule : all timestamps remain UTC ISO instants.
   Display rule : interpreted in the COMPANY timezone, never the
                  device timezone, so a manager in London sees
                  the Dubai company's business day.

   Stage 0 = helper + tests only. No page uses this yet.
   The zone source of truth is set by fiqTz.setZone(); the
   default below is temporary until the company config path is
   confirmed.
   ============================================================ */
var fiqTz = (function () {
  /* Company timezone comes from FIELDIQ_BRAND (brand-config.js), which is
     loaded BLOCKING and before this file on every migrated page, so the value
     is always available. The literal below is a last-resort fallback only. */
  var ZONE = (typeof FIELDIQ_BRAND !== 'undefined' && FIELDIQ_BRAND.companyTimezone) || 'Asia/Dubai';

  function setZone(z) { if (z && typeof z === 'string') ZONE = z; }
  function getZone() { return ZONE; }

  /* Wall-clock parts of an instant, in the company zone. */
  var _fmt = null, _fmtZone = null;
  function formatter() {
    if (_fmt && _fmtZone === ZONE) return _fmt;
    _fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: ZONE, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short'
    });
    _fmtZone = ZONE;
    return _fmt;
  }
  var DOW = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function fields(instant) {
    var d = (instant instanceof Date) ? instant : new Date(instant);
    var p = {}, parts = formatter().formatToParts(d);
    for (var i = 0; i < parts.length; i++) p[parts[i].type] = parts[i].value;
    return {
      y: +p.year, mo: +p.month - 1, d: +p.day,
      h: +p.hour % 24, mi: +p.minute, se: +p.second,
      dow: DOW[p.weekday]
    };
  }

  /* Offset of the company zone at a given instant, in ms. */
  function offsetAt(instant) {
    var f = fields(instant);
    /* Milliseconds must be carried through: Intl reports only to the
       second, so dropping them skews dayEnd (.999) into the next day. */
    var asUTC = Date.UTC(f.y, f.mo, f.d, f.h, f.mi, f.se, instant.getUTCMilliseconds());
    return asUTC - instant.getTime();
  }

  /* Absolute instant for a company-zone wall clock.
     Two-pass: guess with the offset at the naive instant, then
     re-resolve. Handles DST transitions correctly. */
  function instantFor(y, mo, d, h, mi, se, ms) {
    var naive = Date.UTC(y, mo, d, h || 0, mi || 0, se || 0, ms || 0);
    var guess = new Date(naive - offsetAt(new Date(naive)));
    var corrected = new Date(naive - offsetAt(guess));
    return corrected;
  }

  function dayStart(y, mo, d) { return instantFor(y, mo, d, 0, 0, 0, 0); }
  function dayEnd(y, mo, d) { return instantFor(y, mo, d, 23, 59, 59, 999); }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  /* 'YYYY-MM-DD' day key in the company zone — for chart bucketing. */
  function iso(instant) { var f = fields(instant); return f.y + '-' + pad(f.mo + 1) + '-' + pad(f.d); }

  /* Canonical named ranges. Every page uses these; no page computes
     a boundary itself. All ranges are bounded at BOTH ends so a
     future-dated visit can never leak into a past period. */
  function range(period, nowOverride) {
    var now = nowOverride || new Date();
    var n = fields(now);
    var toMonday = (n.dow === 0 ? 6 : n.dow - 1);
    switch (period) {
      case 'today':
        return { start: dayStart(n.y, n.mo, n.d), end: dayEnd(n.y, n.mo, n.d) };
      case 'yesterday':
        return { start: dayStart(n.y, n.mo, n.d - 1), end: dayEnd(n.y, n.mo, n.d - 1) };
      case 'thisWeek':
        return { start: dayStart(n.y, n.mo, n.d - toMonday), end: dayEnd(n.y, n.mo, n.d) };
      case 'lastWeek':
        return { start: dayStart(n.y, n.mo, n.d - toMonday - 7), end: dayEnd(n.y, n.mo, n.d - toMonday - 1) };
      case 'thisMonth':
        return { start: dayStart(n.y, n.mo, 1), end: dayEnd(n.y, n.mo, n.d) };
      case 'lastMonth':
        return { start: dayStart(n.y, n.mo - 1, 1), end: dayEnd(n.y, n.mo, 0) };
      case '7':
        return { start: dayStart(n.y, n.mo, n.d - 6), end: dayEnd(n.y, n.mo, n.d) };
      case '30':
        return { start: dayStart(n.y, n.mo, n.d - 29), end: dayEnd(n.y, n.mo, n.d) };
      case '90':
        return { start: dayStart(n.y, n.mo, n.d - 89), end: dayEnd(n.y, n.mo, n.d) };
      default:
        return { start: null, end: null };
    }
  }

  function inRange(r, instant) {
    var d = (instant instanceof Date) ? instant : new Date(instant);
    if (r.start && d < r.start) return false;
    if (r.end && d > r.end) return false;
    return true;
  }

  return {
    setZone: setZone, getZone: getZone,
    fields: fields, instantFor: instantFor, dayStart: dayStart, dayEnd: dayEnd,
    iso: iso, range: range, inRange: inRange, offsetAt: offsetAt
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = fiqTz;
