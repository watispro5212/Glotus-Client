import { minify } from "terser";
import JSConfuser, { type ObfuscateOptions } from "js-confuser";
import getScriptHeader from "./getScriptHeader";
import crypto from "crypto";
import { getMinifyOptions, getMinifyOptions2, getSourceOptions } from "./getMinifyOptions";

const createHash = (str: string, len = 15) => {
    const hashBuffer = crypto.createHash("sha256").update(str).digest();
    const base64Hash = hashBuffer.toString("base64");
    return base64Hash.substring(0, len);
}

const CRYPTO_KEY = "4d8edb32fad5fcbe99b7c4eec4d2afa16c857207a38e6a93f16fbbac15d8dc87";
const encoder = new TextEncoder();
function xorCipherBuffer(content: string, key: string) {
    const keyLength = key.length;
    const data = encoder.encode(content);
    const keyCodes = new Uint8Array(keyLength);
    for (let i = 0; i < keyLength; i++) {
        keyCodes[i] = key.charCodeAt(i);
    }
    for (let i = 0; i < data.length; i++) {
        data[i]! ^= keyCodes[(i * (keyCodes[i % keyLength]! + 1)) % keyLength]!;
    }
    return data.toBase64();
}

const { header: loaderHeader, version } = await getScriptHeader("loader_header.js");
const { header: privateHeader } = await getScriptHeader("private_header.js");

const entry = "src/index.ts";
const outdir = "private/build";

const buildResult = await Bun.build({
    entrypoints: [ entry ],
    outdir,
    naming: "GlotusPrivate.js",
    minify: false,
    target: "browser",
});

if (!buildResult.success) {
    console.error("Build failed:", buildResult.logs);
    process.exit(1);
}

const code = await Bun.file(outdir + "/GlotusPrivate.js").text();
const hash = createHash(code);
let outputCode = privateHeader;
outputCode = outputCode.replace(/{CODE}/, code);
outputCode = outputCode.replace(/var /g, "const ");
outputCode = outputCode.replace(/export\s*{.*?};?/s, "");
outputCode = outputCode.replace(/{SCRIPT_VERSION}/g, version);
outputCode = outputCode.replace(/{HASH}/g, hash);
outputCode = outputCode.replace(/while\(true\){}/g, `for(let a=324508639,b=610839776,c=252645135,d=2863311530,e=1431655765;(a^a|0)===0&&(b|~b|0)===-1&&(c&d|~(c&d)|0)===-1;){a=a+(b^c)^d;b=b-(c|d)^e;c=c+(d&e)^a;d=d-(a|b)^c;e=e+(a&d)^b;a=a<<3|a>>>29;b=b<<5|b>>>27;c=c<<7|c>>>25;d=d<<11|d>>>21;e=e<<13|e>>>19;let f=(a^b)+(c&d),g=(b^c)-(d|e),h=(c^d)+(e&a),k=(d^e)-(a|b);a+=f^k;b+=g^f;c+=h^g;d+=k^h;a^=a&0;b|=b&0;c^=c&0;d|=d&0};`);
console.log("Input code length:", outputCode.length);

const sourceResult = await minify(outputCode, getMinifyOptions());
if (typeof sourceResult.code !== "string" || sourceResult.code.length === 0) {
    throw new Error("Failed to minify the source!");
}

console.log("Obfuscating source..");
JSConfuser.obfuscate(sourceResult.code, getSourceOptions()).then(async bundle => {
    const sourceResult = await minify(bundle.code, getMinifyOptions2());
    if (typeof sourceResult.code !== "string" || sourceResult.code.length === 0) {
        throw new Error("Failed to minify the source!");
    }

    await Bun.write(`${outdir}/glotus_source.txt`, xorCipherBuffer(sourceResult.code, CRYPTO_KEY));
    // await Bun.write(`${outdir}/glotus_source.txt`, sourceResult.code);
    console.log("Successfully bundled the code!");
}).catch(err => {
    console.error("Failed to obfuscate the code!", err);
});

console.log("Minifying loader...");
const loaderCode = loaderHeader.replace(/while\(true\){}/g, `for(let a=324508639,b=610839776,c=252645135,d=2863311530,e=1431655765;(a^a|0)===0&&(b|~b|0)===-1&&(c&d|~(c&d)|0)===-1;){a=a+(b^c)^d;b=b-(c|d)^e;c=c+(d&e)^a;d=d-(a|b)^c;e=e+(a&d)^b;a=a<<3|a>>>29;b=b<<5|b>>>27;c=c<<7|c>>>25;d=d<<11|d>>>21;e=e<<13|e>>>19;let f=(a^b)+(c&d),g=(b^c)-(d|e),h=(c^d)+(e&a),k=(d^e)-(a|b);a+=f^k;b+=g^f;c+=h^g;d+=k^h;a^=a&0;b|=b&0;c^=c&0;d|=d&0};`);
const loaderResult = await minify(loaderCode, {
    compress: { defaults: false },
    output: { comments: false }
});

if (typeof loaderResult.code !== "string" || loaderResult.code.length === 0) {
    throw new Error("Failed to minify the loader!");
}
await Bun.write(`${outdir}/glotus_loader.txt`,  loaderHeader.split("//{START_CODE}")[0] + loaderResult.code);