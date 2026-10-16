// ── FieldIQ white-label branding config ────────────────────────────────
// Single source of truth for the company name shown across every page.
// To rebrand for a different company, change ONLY the value below — every
// page picks it up automatically on load via applyBrand(). No other file
// needs to be touched.
var FIELDIQ_BRAND = {
  name: 'FieldIQ',
  fieldWorkflowEnabled: true,
  specialistRoleLabel: 'Trainer',
  // Company business timezone, IANA name (never a fixed offset, so DST
  // countries resolve correctly). Every FieldIQ surface derives Today,
  // Yesterday, week, month and chart day-buckets from this value, so the
  // company's business day is the same wherever the viewer happens to be.
  companyTimezone: 'Asia/Dubai'
};

function applyBrand() {
  // Company name: plain text, exactly as it was — inherits each page's
  // own existing h1 styling (size, weight, color) untouched.
  document.querySelectorAll('[data-brand-name]').forEach(function(el) {
    el.innerHTML = '<span style="color:var(--fiq-ink)">Field</span><span style="color:var(--fiq-primary)">IQ</span>';
  });
  // Tagline: back to its original small, gray, letter-spaced style — the
  // only change from before is "FieldIQ" within it now uses the familiar
  // two-tone wordmark (dark "Field" + blue "IQ") instead of plain text.
  // "BY" stays plain, inheriting the tagline element's own gray color.
  document.querySelectorAll('[data-brand-tagline]').forEach(function(el) {
    el.innerHTML = '';
  });
  // Browser tab title is left as the static value already baked into each
  // page's <title> tag at build time (already correct, e.g. "FieldIQ
  // — Dashboard") rather than rewritten dynamically here.
}

document.addEventListener('DOMContentLoaded', applyBrand);
