// Shared by browser views and the static builder; no DOM dependencies.
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const numberFormat = new Intl.NumberFormat('zh-TW', {maximumFractionDigits:2});
export const formatNumber = value => numberFormat.format(Number(value));
