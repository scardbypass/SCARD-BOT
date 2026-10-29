const assert=require('node:assert/strict');
const {extractStatus}=require('../lib/imeiCenter/ceirgo');
const store=require('../lib/imeiCenter/store');
assert.equal(extractStatus({results:[{imei:'356424104776994',status:'UNKNOWN'}]},'356424104776994'),'UNKNOWN');
assert.equal(extractStatus({result_payload:{items:[{imei_status:'REGISTERED'}]}},'356424104776994'),'REGISTERED');
assert.equal(extractStatus({status:'success',order_id:1},'356424104776994'),null);
assert.equal(extractStatus({items:[{status:'UNKNOWN'},{status:'ROAMER'}]},'356424104776994'),null);
assert.equal(store.active('000000000000000'),undefined);
console.log('IMEI Center unit tests OK');
