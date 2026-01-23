import { minify } from "terser";
import getScriptHeader from "./getScriptHeader";

const { header, version } = await getScriptHeader("userscript_header.txt");
const entry = "src/index.ts";
const outdir = "build";

const buildResult = await Bun.build({
    entrypoints: [entry],
    outdir,
    minify: {
        whitespace: true,
        syntax: true,
        identifiers: false,
    },
    target: "browser",
});

if (!buildResult.success) {
    console.error("Build failed:", buildResult.logs);
    process.exit(1);
}

const path = `${outdir}/index.js`;
let code = await Bun.file(path).text();
code = code.replace(/var /g, "const ");
code = code.replace(/export\s*{.*?};?/s, "");
code = code.replace(/{SCRIPT_VERSION}/g, version);
console.log("Input code length:", code.length);

const result = await minify(code, {
    compress: {
        defaults: false,
        unsafe: true,
        dead_code: true,
        unused: true,
        hoist_funs: true,
        hoist_vars: true,
        evaluate: true,
        passes: 3,
    },
    mangle: false,
    format: {
        beautify: true,
        braces: true,
        indent_start: 4,
    }
});

if (result.code) {
    Bun.write(`${outdir}/index.js`, header.replace(/{CODE}/, result.code));
    // Bun.write(`${outdir}/index.js`, header.replace(/{CODE}/, code));
    console.log("Successfully bundled the code!");
}