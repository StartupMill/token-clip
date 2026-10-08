// Runs an extracted distribution without node_modules, against a minimal host RPC stub.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2] ?? '.');
const {default:manifest}=await import(pathToFileURL(resolve(root,'dist/manifest.js')).href);
const child=spawn(process.execPath,[resolve(root,'dist/worker.js')],{cwd:root,stdio:['pipe','pipe','pipe']});
const pending=new Map();let seq=1,errors='';const company='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';let queries=0;
const send=value=>child.stdin.write(JSON.stringify(value)+'\n');
child.stderr.on('data',data=>{errors+=data;});
const lines=createInterface({input:child.stdout});
lines.on('line',line=>{
 try {
  const msg=JSON.parse(line);
  if(msg.method){
   if(msg.method==='db.query'){
    assert.equal(msg.params.params[0],company,'Authorized company must override spoofed params');queries++;
    send({jsonrpc:'2.0',id:msg.id,result:[]});
   } else if(msg.method==='config.get') {assert.equal(msg.params.companyId,company);send({jsonrpc:'2.0',id:msg.id,result:{}});}
   else if(msg.id!==undefined) send({jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:`Unexpected host method ${msg.method}`}});
  }else if(pending.has(msg.id)){const {resolve,reject,timer}=pending.get(msg.id);clearTimeout(timer);pending.delete(msg.id);msg.error?reject(new Error(JSON.stringify(msg.error))):resolve(msg.result);}
 } catch(error){for(const p of pending.values())p.reject(error);}
});
function request(method,params={}){return new Promise((resolve,reject)=>{const id=seq++;const timer=setTimeout(()=>reject(new Error(`${method} timed out. ${errors}`)),5000);pending.set(id,{resolve,reject,timer});send({jsonrpc:'2.0',id,method,params});});}
try{
 const init=await request('initialize',{manifest,config:{},instanceInfo:{instanceId:'smoke',hostVersion:'0.0.0'},apiVersion:1,databaseNamespace:'plugin_token_clip_smoke'});assert.equal(init.ok,true);
 const result=await request('getData',{key:'audit',companyId:company,params:{companyId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',from:'2026-10-08',to:'2026-10-08'}});
 assert.equal(result.totals.records,0);assert.equal(queries,2);assert.equal((await request('health')).status,'ok');
 console.log('Packaged worker smoke passed: initialized, queried authorized company, rejected scope spoofing, returned report and health.');
}finally{for(const p of pending.values())clearTimeout(p.timer);lines.close();child.kill();}
