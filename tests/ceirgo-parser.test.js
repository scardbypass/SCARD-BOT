'use strict';
const assert = require('assert');
const { extractStatus } = require('../lib/imeiCenter/ceirgo');

const imei = '123456789012345';
const cases = [
  ['group UNKNOWN', { UNKNOWN: [{ imei }] }, 'UNKNOWN'],
  ['group ROAMER', { ROAMER: [{ imei }] }, 'ROAMER'],
  ['group REGISTERED', { REGISTERED: [{ imei }] }, 'REGISTERED'],
  ['group IMEI string', { UNKNOWN: [imei] }, 'UNKNOWN'],
  ['direct field', { imei_status: 'UNKNOWN' }, 'UNKNOWN'],
  ['direct with matching IMEI', { imei, imei_status: 'ROAMER' }, 'ROAMER'],
  ['foreign IMEI', { UNKNOWN: [{ imei: '999999999999999' }] }, null],
  ['foreign direct IMEI', { imei: '999999999999999', imei_status: 'UNKNOWN' }, null],
  ['empty group', { UNKNOWN: [] }, null],
  ['ambiguous group', { UNKNOWN: [{ imei }], ROAMER: [{ imei }] }, null],
  ['order status is not IMEI status', { status: 'success' }, null],
  ['invalid IMEI', { UNKNOWN: [{ imei }] }, null, 'invalid']
];
for (const [name, payload, expected, mode] of cases) {
  assert.strictEqual(extractStatus(payload, mode === 'invalid' ? '123' : imei), expected, name);
  console.log('PASS', name);
}
console.log('TOTAL:', cases.length, '/', cases.length);
