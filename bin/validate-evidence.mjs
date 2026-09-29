#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { validateManifest } from "../lib/evidence.mjs";

const file=process.argv[2];
if(!file){console.error("[HELD] usage: node bin/validate-evidence.mjs <evidence.json>");process.exit(2);}
let doc;
try{doc=JSON.parse(readFileSync(file,"utf8"));}catch(e){console.error("[HELD] INVALID_JSON: "+e.message);process.exit(3);}
const result=validateManifest(doc.manifest,doc.batch);
console.log(JSON.stringify(result,null,2));
process.exit(result.state==="VALIDATED"?0:1);
