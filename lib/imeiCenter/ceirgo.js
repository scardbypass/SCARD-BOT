'use strict';
const axios = require('axios');

const VALID = new Set(['UNKNOWN', 'ROAMER', 'REGISTERED']);
const STATUS_FIELDS = new Set([
  'status_imei', 'imei_status', 'ceir_status', 'ceir',
  'registration_status', 'registrationStatus'
]);
const WRAPPER_FIELDS = new Set([
  'result', 'result_payload', 'data', 'results', 'items', 'response'
]);
const IMEI_FIELDS = new Set(['imei', 'imei1', 'imei_number', 'imeiNumber', 'device_imei']);

const base = () => String(process.env.CEIRGO_API_BASE_URL || 'https://ceirgo.id').replace(/\/$/, '');
const timeout = () => Math.max(3000, Number(process.env.CEIRGO_TIMEOUT_MS || 20000));
const headers = () => {
  if (!process.env.CEIRGO_API_KEY) throw Error('API CeirGo belum dikonfigurasi');
  return {
    Authorization: 'Bearer ' + process.env.CEIRGO_API_KEY,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
};
async function api(method, url, data) {
  const response = await axios({
    method, url: base() + url, data, headers: headers(), timeout: timeout(),
    validateStatus: code => code >= 200 && code < 300
  });
  return response.data;
}
function normalize(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}
function extractStatus(payload, imei) {
  const target = String(imei || '');
  if (!/^\d{15}$/.test(target)) return null;
  const found = new Set();
  const seen = new WeakSet();

  // A grouped status is trusted only when its entry explicitly identifies
  // the requested IMEI. An empty/anonymous group must never authorize an order.
  function hasTarget(value, depth = 0) {
    if (depth > 8 || value == null) return false;
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value).trim() === target;
    }
    if (Array.isArray(value)) return value.some(v => hasTarget(v, depth + 1));
    if (typeof value !== 'object') return false;
    return Object.entries(value).some(([key, item]) => {
      if (key === target) return true;
      if (IMEI_FIELDS.has(key) && String(item).trim() === target) return true;
      return item && typeof item === 'object' && hasTarget(item, depth + 1);
    });
  }

  function walk(value, depth = 0, matched = false) {
    if (depth > 8 || value == null) return;
    if (Array.isArray(value)) {
      value.forEach(item => walk(item, depth + 1, matched));
      return;
    }
    if (typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);

    const ownImei = Object.entries(value)
      .filter(([key]) => IMEI_FIELDS.has(key) || /^\d{15}$/.test(key))
      .map(([key, item]) => /^\d{15}$/.test(key) ? key : String(item).trim());
    if (ownImei.length && !ownImei.includes(target)) return;
    const hereMatched = matched || ownImei.includes(target);

    for (const [key, item] of Object.entries(value)) {
      const groupStatus = normalize(key);
      if (VALID.has(groupStatus) && Array.isArray(item)) {
        if (item.some(entry => hasTarget(entry))) found.add(groupStatus);
        continue;
      }
      if (key === target) {
        walk(item, depth + 1, true);
        continue;
      }
      if (STATUS_FIELDS.has(key) && VALID.has(normalize(item)) && hereMatched) {
        found.add(normalize(item));
        continue;
      }
      if (WRAPPER_FIELDS.has(key) || key === 'status' && hereMatched) {
        if (typeof item === 'string' && key === 'status' && VALID.has(normalize(item))) {
          found.add(normalize(item));
        } else {
          walk(item, depth + 1, hereMatched);
        }
      }
    }
  }

  walk(payload);
  return found.size === 1 ? [...found][0] : null;
}

async function check(imei) {
  const target = String(imei || '');
  if (!/^\d{15}$/.test(target)) throw Error('IMEI tidak valid');
  const code = process.env.CEIRGO_IMEI_SERVICE_CODE || 'cek_imei';
  let response = await api('post', '/api/order', { code, data: { imeis: [target] } });
  const orderId = response?.order_id || response?.data?.order_id;
  const tries = Math.max(1, Math.min(30, Number(process.env.CEIRGO_POLL_ATTEMPTS || 8)));
  const interval = Math.max(1000, Number(process.env.CEIRGO_POLL_INTERVAL_MS || 3000));

  for (let attempt = 0; attempt < tries; attempt++) {
    const data = response?.data && typeof response.data === 'object' ? response.data : response;
    const orderStatus = normalize(data?.status).toLowerCase();
    if (['failed', 'error', 'cancelled', 'canceled'].includes(orderStatus)) {
      throw Error('Verifikasi CeirGo gagal');
    }
    if (['success', 'partial'].includes(orderStatus)) {
      const result = data?.result ?? data?.result_payload;
      const status = extractStatus(result, target);
      if (status) return status;
    }
    if (!orderId || attempt === tries - 1) break;
    await new Promise(resolve => setTimeout(resolve, interval));
    response = await api('get', '/api/order/' + encodeURIComponent(orderId));
  }
  throw Error('Status IMEI tidak tersedia / belum dikenali');
}
module.exports = { check, extractStatus };
