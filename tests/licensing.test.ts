import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LicenseConditions } from "../components/licensing/LicenseConditions";
import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { contractInputSchema, contractPatchSchema } from "../lib/marketplace/validation";
import { conditionRows } from "../lib/licensing/conditions";
import { licenseSnapshot, licenseTermsHash } from "../lib/licensing/server";
import { agreementHtml, licenseExpiry, type AgreementSnapshot } from "../lib/licensing/agreement";
import { serializeLicense } from "../lib/marketplace/server";
import { signAccessToken } from "../lib/auth";
import Contract from "../models/Contract";
import Track from "../models/Track";
import User from "../models/User";
import Order from "../models/Order";
import Discount from "../models/TrackDiscount";
import Quota from "../models/ApiRateLimit";
import { POST as createContract } from "../app/api/contracts/route";
import { PATCH as editContract } from "../app/api/contracts/[id]/route";
import { POST as quote } from "../app/api/orders/quote/route";
import { POST as checkout } from "../app/api/orders/route";
import { GET as agreement } from "../app/api/orders/[id]/agreement/route";
import type { OrderFields } from "../models/Order";

const buyer = new mongoose.Types.ObjectId(), producer = new mongoose.Types.ObjectId(), trackId = new mongoose.Types.ObjectId(), contractId = new mongoose.Types.ObjectId();
const input = {
  title: "Studio WAV", description: "One new song", price: "250000", currency: "IRT", trackIds: [String(trackId)],
  licenseType: "NON_EXCLUSIVE", formats: ["WAV"], commercialUse: true, creditRequired: false, creditText: "",
  streamingLimit: 50000, distributionLimit: 1000, musicVideoLimit: 0, livePerformance: true, broadcastRights: false,
  contentIdAllowed: false, termMonths: 24, royaltyPercent: 5, publishingSharePercent: 25,
  governingLaw: "Producer's stated jurisdiction", territory: { worldwide: false, includedCountries: ["IR", "GB"], excludedCountries: ["US"] },
  customTerms: "Do not distribute the standalone beat. <script>alert('test')</script>",
};

test("license fields validate and PATCH does not silently reset omitted conditions", () => {
  assert.equal(licenseExpiry(new Date("2028-01-31T10:00:00Z"),1).toISOString(), "2028-02-29T10:00:00.000Z");
  const data = contractInputSchema.parse(input);
  assert.equal(data.musicVideoLimit, 0); assert.equal(data.creditRequired, false);
  assert.deepEqual(contractPatchSchema.parse({ title: "Updated" }), { title: "Updated" });
  for (const patch of [{ royaltyPercent: 101 }, { publishingSharePercent: -1 }, { termMonths: 0 }, { musicVideoLimit: -1 }, { territory: { worldwide: false, includedCountries: [], excludedCountries: [] } }]) assert.equal(contractPatchSchema.safeParse(patch).success, false);
  assert.equal(contractPatchSchema.safeParse({ territory: { worldwide: false, includedCountries: ["IR"], excludedCountries: ["IR"] } }).success, false);
});

test("editor, fresh quote, checkout consent and purchased agreement use the same saved conditions", async t => {
  const env = { ...process.env };
  process.env.JWT_SECRET = "local-license-tests-secret-at-least-32-characters";
  process.env.APP_URL = "https://local.example.test";
  process.env.ZARINPAL_MERCHANT_ID = "00000000-0000-4000-8000-000000000001";
  process.env.ZARINPAL_SANDBOX = "true";
  const cache = (globalThis as typeof globalThis & { mongooseCache: { connection: typeof mongoose | null } }).mongooseCache;
  const connection = cache.connection; cache.connection = mongoose;
  const restores: (()=>void)[] = [];
  function replace(object: object, key: string, value: unknown) {
    const old = Object.getOwnPropertyDescriptor(object,key); Object.defineProperty(object,key,{configurable:true,writable:true,value});
    restores.push(()=>{if(old)Object.defineProperty(object,key,old);else Reflect.deleteProperty(object,key);});
  }
  let actor = producer, roles = ["PRODUCER"];
  let contract = new Contract({ _id: contractId, producerId: producer, ...input, trackIds: [trackId], terms: input, filesToDeliver: [{ format: "WAV", label: "WAV master", required: true }] });
  let saved: (OrderFields & { _id: mongoose.Types.ObjectId; save: ()=>Promise<void> }) | undefined;
  let gatewayCalls = 0;
  const master = { key: "00000000-0000-4000-8000-000000000001.master.wav", bucket: "not-contacted", provider: "S3", mimeType: "audio/wav" };
  replace(User,"findById",(id: unknown)=>({select:async()=>String(id)===String(producer) ? {_id:producer,id:String(producer),firstName:"Original",lastName:"Producer",email:"seller@example.test",roles,status:"ACTIVE",sessionVersion:0} : {_id:buyer,id:String(buyer),firstName:"Original",lastName:"Buyer",email:"buyer@example.test",roles,status:"ACTIVE",sessionVersion:0}}));
  replace(User,"exists",async()=>true);
  replace(Quota,"updateOne",async()=>({}));
  replace(Track,"countDocuments",async()=>1);
  replace(Track,"findOne",()=>({select:async()=>({_id:trackId,producerId:producer,title:"Purchased beat",audio:{master}})}));
  replace(Discount,"findOne",async()=>null); replace(Discount,"find",async()=>[]);
  replace(Contract,"findOne",async()=>contract);
  replace(Contract,"create",async(data: object)=>{contract=new Contract({_id:contractId,...data});return contract;});
  replace(Order,"findOne",(filter: Record<string,unknown>)=>{
    if ("idempotencyKey" in filter) return Promise.resolve(null);
    const result = saved && String(filter.buyerId)===String(buyer) && saved.status==="PAID" && String(filter._id)===String(saved._id) ? saved : null;
    return {select:async()=>result};
  });
  replace(Order,"create",async(data: OrderFields)=>{saved={...data,_id:new mongoose.Types.ObjectId(),createdAt:new Date(),updatedAt:new Date(),save:async()=>{}};return saved;});
  replace(globalThis,"fetch",async()=>{gatewayCalls++;return Response.json({data:{code:100,authority:"S"+"1".repeat(35)}});});
  const request = (path: string, data?: unknown, method="POST")=>new Request(`https://local.example.test${path}`,{method,headers:{Authorization:`Bearer ${signAccessToken({id:String(actor),roles: roles as ["PRODUCER"]})}`,"Content-Type":"application/json"},...(data===undefined?{}:{body:JSON.stringify(data)})});
  try {
    await t.test("producer saves every condition, including long multilingual terms",async()=>{
      const response=await createContract(request("/api/contracts",{...input,customTerms:"شرایط مجوز ".repeat(1700)}));
      assert.equal(response.status,201); const body=await response.json();
      assert.equal(body.contract.conditions.musicVideoLimit,0); assert.equal(body.contract.conditions.creditRequired,false);
      assert.equal(body.contract.conditions.territory.worldwide,false); assert.ok(body.contract.customTerms.length>16000);
      assert.equal(body.contract.conditions.royaltyPercent,5);
      Object.defineProperty(contract,"save",{configurable:true,value:async()=>contract});
      const before=contract.terms.musicVideoLimit;
      const edited=await editContract(request(`/api/contracts/${contractId}`,{title:"Renamed",expectedVersion:contract.version},"PATCH"),{params:Promise.resolve({id:String(contractId)})});
      assert.equal(edited.status,200); assert.equal(contract.terms.musicVideoLimit,before); assert.equal(contract.terms.creditRequired,false);
      assert.equal((await editContract(request(`/api/contracts/${contractId}`,{title:"Stale",expectedVersion:1},"PATCH"),{params:Promise.resolve({id:String(contractId)})})).status,409);
      contract.terms.customTerms=input.customTerms;
    });
    let quoted: ReturnType<typeof serializeLicense>;
    await t.test("fresh quote discloses all rights and never contains an original reference",async()=>{
      const response=await quote(request("/api/orders/quote",{items:[{trackId:String(trackId),contractId:String(contractId)}]}));
      assert.equal(response.status,200);const data=await response.json();quoted=data.items[0].license;
      assert.equal(quoted.conditions?.musicVideoLimit,0);assert.equal(quoted.conditions?.creditRequired,false);
      assert.equal(quoted.termsHash,licenseTermsHash(contract));
      const text=JSON.stringify(data);assert.ok(!text.includes(master.key));assert.ok(!text.includes(master.bucket));
      const rendered = renderToStaticMarkup(createElement(LicenseConditions, { license: quoted }));
      for (const [label] of conditionRows(quoted.conditions!)) assert.ok(rendered.includes(label), `Missing checkout condition: ${label}`);
      assert.ok(rendered.includes("Not required")); assert.ok(rendered.includes("&lt;script&gt;")); assert.ok(!rendered.includes("<script>"));
      assert.equal(conditionRows(quoted.conditions!).find(([label])=>label==="Music videos")?.[1],"0");
    });
    const orderInput=()=>({idempotencyKey:"00000000-0000-4000-8000-000000000001",acceptTerms:true,items:[{trackId:String(trackId),contractId:String(contractId),expectedPrice:quoted.price,expectedVersion:quoted.version,expectedTermsHash:quoted.termsHash,expectedDiscountVersion:null}]});
    await t.test("unaccepted, missing or changed terms cannot start payment",async()=>{
      actor=buyer;roles=["USER"];
      assert.equal((await checkout(request("/api/orders",{...orderInput(),acceptTerms:false}))).status,400);
      const missing=orderInput();missing.items[0].expectedTermsHash=undefined;
      assert.equal((await checkout(request("/api/orders",missing))).status,400);
      contract.terms.broadcastRights=true;
      assert.equal((await checkout(request("/api/orders",orderInput()))).status,409);
      assert.equal(gatewayCalls,0);contract.terms.broadcastRights=false;
    });
    await t.test("checkout stores immutable party names and terms without returning original data",async()=>{
      const response=await checkout(request("/api/orders",orderInput()));assert.equal(response.status,201);
      const body=await response.json();assert.ok(saved);assert.equal(body.order.items[0].agreementUrl,null);assert.ok(!JSON.stringify(body).includes(master.key));
      const frozen=JSON.parse(saved.items[0].agreement!) as AgreementSnapshot;
      assert.equal(frozen.buyer.name,"Original Buyer");assert.equal(frozen.seller.name,"Original Producer");
      assert.deepEqual(frozen.license,licenseSnapshot(contract));
      contract.terms.streamingLimit=999;contract.title="Later edit";
      assert.equal(JSON.parse(saved.items[0].agreement!).license.conditions.streamingLimit,50000);
      assert.equal(JSON.parse(saved.items[0].agreement!).license.title,"Renamed");
    });
    await t.test("agreement is paid-buyer-only, escaped, printable and downloadable",async()=>{
      assert.ok(saved);const context={params:Promise.resolve({id:String(saved._id)})};const path=`/api/orders/${saved._id}/agreement?item=0`;
      assert.equal((await agreement(request(path,undefined,"GET"),context)).status,404);
      saved.status="PAID";saved.paidAt=new Date("2026-11-22T10:00:00Z");saved.gatewayMode="live";
      const response=await agreement(request(path,undefined,"GET"),context);assert.equal(response.status,200);const html=await response.text();
      assert.ok(html.includes("Original Buyer"));assert.ok(html.includes("50,000"));assert.ok(!html.includes("<script>"));assert.ok(html.includes("&lt;script&gt;"));assert.ok(!html.includes(master.key));
      assert.equal(response.headers.get("cache-control"),"private, no-store");
      const attachment=await agreement(request(path+"&download=1",undefined,"GET"),context);assert.match(attachment.headers.get("content-disposition")!,/^attachment/);
      actor=producer;roles=["PRODUCER"];assert.equal((await agreement(request(path,undefined,"GET"),context)).status,404);
      assert.equal((await agreement(new Request("https://local.example.test"+path),context)).status,401);
      const snapshot=JSON.parse(saved.items[0].agreement!) as AgreementSnapshot;
      assert.ok(agreementHtml(snapshot,String(saved._id),0,saved.paidAt).includes("24 months"));
    });
  } finally {
    for(const reset of restores.reverse())reset();cache.connection=connection;
    for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);
  }
});
