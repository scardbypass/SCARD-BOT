const assert=require('node:assert/strict');
const {extractStatus}=require('../lib/imeiCenter/ceirgo');
const store=require('../lib/imeiCenter/store');
assert.equal(extractStatus({results:[{imei:'356424104776994',status:'UNKNOWN'}]},'356424104776994'),'UNKNOWN');
assert.equal(extractStatus({result_payload:{items:[{imei_status:'REGISTERED'}]}},'356424104776994'),'REGISTERED');
assert.equal(extractStatus({status:'success',order_id:1},'356424104776994'),null);
assert.equal(extractStatus({items:[{status:'UNKNOWN'},{status:'ROAMER'}]},'356424104776994'),null);
assert.equal(store.active('000000000000000'),undefined);
console.log('IMEI Center unit tests OK');

const {parseAirbotResult}=require('../lib/imeiCenter/core');
const imei='354542501034022';
assert.equal(parseAirbotResult('Success✅\n'+imei,imei),'success');
assert.equal(parseAirbotResult('Failed❌\n'+imei,imei),'failed');
assert.equal(parseAirbotResult('Tidak tersedia (Gangguan atau CLOSE)',imei),'unavailable');
assert.equal(parseAirbotResult('Success✅\n354542501034023',imei),null);
assert.equal(parseAirbotResult('Sedang diproses',imei),null);
console.log('AirBot response parser tests OK');

const {state,allowed}=store;
assert.equal(allowed('3b','__unregistered_group__'),false,'unregistered seller must be denied');
assert.equal(parseAirbotResult('Success\\n354542501034022\\n354542501034023',imei),null);
assert.equal(parseAirbotResult('Tidak tersedia (Gangguan atau CLOSE)',imei),'unavailable');
console.log('IMEI seller access and duplicate-result tests OK');
