import { minify } from "terser";
import JSConfuser, { type ObfuscateOptions } from "js-confuser";
import getScriptHeader from "./getScriptHeader";
import crypto from "crypto";

const createHash = (str: string, len = 15) => {
    const hashBuffer = crypto.createHash("sha256").update(str).digest();
    const base64Hash = hashBuffer.toString("base64");
    return base64Hash.substring(0, len);
}

const { header: loaderHeader, version } = await getScriptHeader("loader_header.txt");
const { header: privateHeader } = await getScriptHeader("private_header.txt");

const entry = "src/index.ts";
const outdir = "private/build";

const buildResult = await Bun.build({
    entrypoints: [entry],
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
console.log("Input code length:", outputCode.length);

const result = await minify(outputCode, {
    compress: {
        arrows: true,
        arguments: true,
        booleans: true,
        booleans_as_integers: true,
        collapse_vars: true,
        comparisons: true,
        computed_props: true,
        conditionals: true,
        dead_code: true,
        directives: true,
        drop_console: true,
        drop_debugger: true,
        ecma: 2020,
        evaluate: true,
        expression: true,
        hoist_funs: true,
        hoist_props: true,
        hoist_vars: true,
        if_return: true,
        inline: true,
        join_vars: true,
        keep_classnames: false,
        keep_fargs: false,
        keep_fnames: false,
        keep_infinity: false,
        loops: true,
        negate_iife: true,
        passes: 3,
        properties: true,
        pure_getters: "strict",
        reduce_funcs: true,
        reduce_vars: true,
        sequences: true,
        side_effects: true,
        switches: true,
        toplevel: true,
        typeofs: true,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_comps: true,
        unsafe_Function: true,
        unsafe_math: true,
        unsafe_symbols: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
        unused: true,
    },
    mangle: {
        eval: true,
        keep_classnames: false,
        keep_fnames: false,
        module: true,
        properties: {
            regex: /^[^_\.]/,
            reserved: [
                "requestAnimFrame", "frvrSdkInitPromise", "FRVR", "bootstrapper", "complete", "tracker", "levelStart",
                "ads", "show", "channelCharacteristics", "allowNavigation", "setChannel", "gameInit",

                "Glotus", "myClient", "myPlayer", "offset", "setXY", "hooks", "ModuleHandler", "upgradeItem",
                "settings", "ObjectRenderer", "preRender", "buy", "equip", "render", "Renderer", "renderObjects", "EntityRenderer",
                "currentAngle", "id", "sid", "x", "y", "dir", "xWiggle", "yWiggle", "turnSpeed", "owner", "scale", "health",
                "maxHealth", "isAI", "isPlayer", "index", "team", "checkTrusted", "maxScreenWidth", "maxScreenHeight",
                "algorithm", "challenge", "number", "salt", "signature", "test", "took", "type", "payload", "start", "max",
                "worker", "challengeData", "solution", "maxnumber", "obfuscated", "key", "teams", "primary", "secondary",
                "wood", "food", "stone", "gold", "kills", "mapPreRender", "renderPlayer", "weaponIndex", "buildIndex",
                "tailIndex", "skinIndex", "weaponVariant", "skinColor", "scale", "showText", "postRender",
                "smooth", "ZoomHandler", "w", "h", "name", "moofoll", "skin", "method", "headers", "body", "Content-Type"
            ]
        },
        toplevel: true
    },
    output: {
        beautify: false,
        braces: false,
        comments: false,
        ecma: 2020,
        indent_level: 0,
        indent_start: 0,
        inline_script: true,
        keep_numbers: false,
        keep_quoted_props: false,
        quote_keys: false,
        quote_style: 1,
        semicolons: true,
        shebang: false,
        webkit: false,
        wrap_iife: false,
        wrap_func_args: false
    },
    sourceMap: false,
    ecma: 2020,
    keep_classnames: false,
    keep_fnames: false,
    ie8: false,
    module: true,
    safari10: false,
    toplevel: true,
});

const confuserOptions: ObfuscateOptions = {
    target: 'browser',
    compact: true,
    identifierGenerator: 'mangled',
    preserveFunctionLength: true,
    stringConcealing: 1,
    stringEncoding: 0.4,
    calculator: 0.4,
    duplicateLiteralsRemoval: 0.5,
    renameGlobals: true,
    renameLabels: true,
    objectExtraction: 0.5,
    dispatcher: 0.2,
    astScrambler: true,
    opaquePredicates: 0.2,
    shuffle: 1,
    movedDeclarations: 0.5,
    globalConcealing: 1,
    stringSplitting: 0.3,
    deadCode: 0.1,
    globalVariables: new Set(["GM_info"]),
    lock: {
        integrity: false,
    }
};

const encryptFile = (text: string, secret: string) => {
    try {
        const key = Buffer.from(secret, "hex");
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        let encrypted = cipher.update(text, "utf8", "base64");
        encrypted += cipher.final("base64");
        return JSON.stringify({
            iv: iv.toString("hex"),
            data: encrypted
        });
    } catch(err) {
        return null;
    }
}

// BUNDLE LOADER
    const minifiedHeader = await minify(loaderHeader, {
        compress: { defaults: false },
        output: { comments: false }
    });
    if (minifiedHeader.code) {
        // Bun.write(`${outdir}/loader.js`, loaderHeader.split("//{START_CODE}")[0] + minifiedHeader.code);
        JSConfuser.obfuscate(minifiedHeader.code, {
            target: 'browser',
            compact: true,
            identifierGenerator: 'mangled',
            preserveFunctionLength: true,
            stringConcealing: 1,
            stringEncoding: 0.6,
            calculator: 1,
            duplicateLiteralsRemoval: 0.4,
            renameGlobals: true,
            renameLabels: true,
            objectExtraction: 0.6,
            dispatcher: 0.4,
            astScrambler: true,
            opaquePredicates: 0.4,
            shuffle: 1,
            movedDeclarations: 0.6,
            globalConcealing: 1,
            stringSplitting: 0.7,
            deadCode: 0.3,
            globalVariables: new Set(["GM_info"]),
            lock: {
                integrity: false,
            }
        }).then(result => {
            Bun.write(`${outdir}/loader.js`, loaderHeader.split("//{START_CODE}")[0] + result.code);
            console.log("Successfully bundled the loader!");
        }).catch(err => {
            console.error("Failed to obfuscate the loader!");
            console.error(err);
        });
    }

    if (result.code) {
        // Bun.write(`${outdir}/GlotusPrivate.js`, result.code);//privateHeader.replace(/{CODE}/, minified.code));
        JSConfuser.obfuscate(result.code, confuserOptions).then(async bundle => {
            const bundleData = encryptFile(bundle.code, Bun.env["SECRET_KEY"]!);
            if (bundleData !== null) {
                await Bun.write(`${outdir}/index.txt`, bundleData);
                console.log("Successfully bundled the code!");
            }
        }).catch(err => {
            console.error("Failed to obfuscate the code!");
            console.error(err);
        });

        try {
            const serverMain = await Bun.file("./private/main.js").text();
            const serverData = encryptFile(serverMain, Bun.env["SECRET_KEY"]!);
            if (serverData !== null) {
                await Bun.write(`${outdir}/server.txt`, serverData);
                console.log("Successfully encrypted server!");
            }
        } catch(err) {
            console.error("Failed to encrypt server!");
            console.error(err);
        }
    }