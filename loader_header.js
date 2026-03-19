// ==UserScript==
// @name            !!! Glotus Client Loader
// @author          Murka
// @description     An excellent Moomoo.io hack for a comfortable gaming experience
// @icon            https://i.imgur.com/rlMQW2P.png
// @version         {SCRIPT_VERSION}
// @match           *://moomoo.io/*
// @match           *://*.moomoo.io/*
// @run-at          document-start
// @grant           GM_info
// @grant           unsafeWindow
// @license         MIT
// ==/UserScript==
/* jshint esversion:6 */

/*
    Author: Murka
    Github: https://github.com/Murka007/
    Greasyfork: https://greasyfork.org/users/919633
    Discord: https://discord.gg/cPRFdcZkeD

    This loader belongs to: {BELONGS_TO}
    Do not store any copies of it, especially on discord. Otherwise you'll get permanently banned.
    Install in userscript manager once and do not touch it.

    Version: {SCRIPT_VERSION}
    Built Time: {BUILD_TIME}
    Works On: {WORKS_ON}
*/

//{OBFUS_END}
//{START_CODE}

(function(win, GM_info) {

    // some shit may happen, testing purposes
    const VERBOSE = false;

    // MAKE SURE TO RETRIEVE TOKEN CODE BEFORE CALLING DEBUGGER
    // OTHERWISE IT MIGHT GET SPOOFED
    let access_token = null;
    try {
        const hash = win.location.hash.substring(1);
        const params = new win.URLSearchParams(hash);

        access_token = params.get("access_token");
        if (access_token !== null) {
            win.history.replaceState({}, win.document.title, win.location.pathname);
        }
    } catch(err){}

    win.Math.LN1 = 24518593;

    // ANTI CONSOLE LOGGING MEASUREMENTS
    (function() {
        win.Math.LN1 = (~win.Math.LN1 + 24518714);
        const _console = win.console;
        if (!_console) return;

        const _methods = [
            'debug', 'error', 'info', 'log', 'warn', 'dir',
            'dirxml', 'table', 'trace', 'group', 'groupCollapsed',
            'groupEnd', 'clear', 'count', 'countReset', 'assert',
            'profile', 'profileEnd', 'time', 'timeLog', 'timeEnd',
            'timeStamp', 'context', 'createTask'
        ];
            
        const empty_func = new Function(`return function(){}`)();
        for (let i=0;i<_methods.length;i++) {
            const method = _methods[i];
            _console[method] = empty_func;
            if (_console[method] !== empty_func) {
                if (VERBOSE) alert("console hook");
                while(true){}
            }
        }
    })();

    // PREVENT OPENNING DEVTOOLS, MAY NOT WORK WHEN THERE IS A FOCUSED IFRAME
    (function() {
        const keydownHandler = (event) => {
            const { code, ctrlKey, shiftKey } = event;
            if (
                ctrlKey && shiftKey &&
                (code === "KeyI" || code === "KeyJ" || code === "KeyM") ||
                code === "F12" ||
                ctrlKey && code === "KeyU"
            ) {
                if (VERBOSE) alert("keydown press");
                event.preventDefault();
                while(true){}
            }
        }

        const contextmenuHandler = (event) => {
            event.preventDefault();
        }
        win.Math.LN1 = (win.Math.LN1 * 25 - 500);

        const targets = [ window, document ];
        for (const target of targets) {
            target.addEventListener("keydown", keydownHandler);
            target.addEventListener("contextmenu", contextmenuHandler);
            target.oncontextmenu = contextmenuHandler;
        }
    })();

    const random = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const createHash = (input) => {
        let hash = 2166136261;
        const fnvPrime = 16777619;

        for (let i = 0; i < input.length; i++) {
            const charCode = input.charCodeAt(i);
            hash ^= charCode;
            hash *= fnvPrime;
            hash = hash & 0xFFFFFFFF;
        }

        let hexString = hash.toString(16);
        while (hexString.length < 8) {
            hexString = "0" + hexString;
        }
        
        return hexString;
    }

    const isNativeFunction = (scope, func) => {
        const nativeRegex = /function \w+\(\)\s*\{\s*\[native code\]\s*\}/;
        const _test = scope.RegExp.prototype.test;
        const _Function = scope.Function.prototype.toString;
        
        const isNative = () => {
            return _test.call(nativeRegex, _Function.call(func));
        }

        return isNative();
    }

    // Prevent hooking of important methods to avoid source leak
    if (!isNativeFunction(win, win.fetch) ||
        !isNativeFunction(win, win.XMLHttpRequest) ||
        !isNativeFunction(win, win.XMLHttpRequest.prototype.open) ||
        !isNativeFunction(win, win.XMLHttpRequest.prototype.send) ||
        !isNativeFunction(win, win.atob) ||
        !isNativeFunction(win, win.btoa) ||
        !isNativeFunction(win, win.JSON.stringify) ||
        !isNativeFunction(win, win.JSON.parse) ||
        !isNativeFunction(win, win.prompt)
    ) {
        if (VERBOSE) alert("native hook 1");
        while(true){}
        return;
    }

    // Different eval variants, picks random method to safely inject the code
    const EVAL = (scope, code) => {
        if (
            !isNativeFunction(scope, scope.eval) ||
            !isNativeFunction(scope, scope.Function) ||
            !isNativeFunction(scope, scope.Array.prototype.constructor.constructor)
        ) {
            if (VERBOSE) alert("native hook 2");
            while(true){}
            return;
        }

        const methods = [
            () => (0, scope.eval)(code),
            () => scope.Function(code)(),
            () => new scope.Function(code)(),
            () => scope.Array.prototype.constructor.constructor(code)(),
        ];

        return methods[random(0, methods.length - 1)]();
    }

    let injectedDebugger = false;
    const callDebugger = (scope) => {
        EVAL(scope, `(function(){for(let i=0;i<10;i++){const now=Date.now();debugger;if(Date.now()-now>150){for(;;){}}}})();`);
        injectedDebugger = true;
        return true;
    }

    if (!callDebugger(win) || !injectedDebugger) {
        if (VERBOSE) alert("debugger fail 1");
        while(true){}
        return;
    }

    win.addEventListener("blur", () => callDebugger(win));
    win.setInterval(() => {
        if (!callDebugger(win)) {
            while(true){}
        }
    }, random(4000, 5000));

    win.Math.LN1 = ((win.Math.LN1 - (win.Math.LN1 % 22)) / 22) | 55;

    const sanitize = (text) => {
        return text.replace(/[\s\n]/g, "").replace(/\/\/==\/?UserScript==/g, "");
    }

    // Basic integrity checks
    let failedToCheck = true;
    try {
        const _info = GM_info;
        const name = sanitize(_info.script.name);
        const author = sanitize(_info.script.author);
        win.Math.LN1 = (win.Math.LN1 % 35);
        const version = sanitize(_info.script.version);
        const scriptMetaStr = sanitize(_info.scriptMetaStr);

        if (
            name !== "!!!GlotusClientLoader" ||
            author !== "Murka" ||
            version !== "{SCRIPT_VERSION}" ||
            createHash(scriptMetaStr) !== "{HEADER_HASH}"
        ) {
            if (VERBOSE) alert("invalid headers");
            while(true){}
            return;
        }

        win.Math.LN1 = (win.Math.LN1 >> 23) + 22;
        failedToCheck = false;
    } catch(err) {
        while(true){}
        return;
    }

    if (failedToCheck) {
        while(true){}
        return;
    }

    let isRightDomain = false;
    try {
        if (/moomoo\.io/.test(win.location.hostname)) {
            isRightDomain = true;
            win.Math.LN1 = ((win.Math.LN1 % 21) ** 21);
        }
    } catch(err) {
        while(true){}
        return;
    }

    if (!isRightDomain) {
        if (VERBOSE) alert("invalid domain");
        while(true){}
        return;
    }

    function garbage_function(inputNumber) {
        const numerator = Math.sqrt(inputNumber * Math.exp(0));
        const logMagnitude = Math.floor(Math.log(inputNumber) / Math.LN10);
        const denominator = Math.pow(10, logMagnitude - 6);
        const adjustment = Math.sin(0);
        return Math.round((numerator / denominator) + adjustment);
    }

    const garbage_output = garbage_function(1225000000);
    win.grbtp = garbage_output;

    // Custom base64 encoder/decoder with a custom charset
    // Works the same way, but with utf16 support and only for personal use
    const charset = "qx8VYyHRzitWfJuoXwUG719Zgsmevch3EClNP5FMQpdDjKBrnLa4IkA2TO6bS0+/";
    function btoa_pure(inputStr) {
        let output = "";

        const byteStream = [];
        for (let i = 0; i < inputStr.length; i++) {
            const charCode = inputStr.charCodeAt(i);

            if (charCode < 0x80) {
                byteStream.push(charCode);
            } else if (charCode < 0x800) {
                byteStream.push(
                    (0xC0 | (charCode >> 6)),
                    (0x80 | (charCode & 0x3F))
                );
            } else if (charCode < 0x10000) {
                byteStream.push(
                    (0xE0 | (charCode >> 12)),
                    (0x80 | ((charCode >> 6) & 0x3F)),
                    (0x80 | (charCode & 0x3F))
                );
            } else {
                byteStream.push(
                    (0xF0 | (charCode >> 18)),
                    (0x80 | ((charCode >> 12) & 0x3F)),
                    (0x80 | ((charCode >> 6) & 0x3F)),
                    (0x80 | (charCode & 0x3F))
                );
            }
        }

        let i = 0;
        while (i < byteStream.length) {
            const byte1 = byteStream[i++];
            const byte2 = byteStream[i++];
            const byte3 = byteStream[i++];

            const enc1 = byte1 >> 2;
            const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
            const enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
            const enc4 = byte3 & 63;

            output += charset.charAt(enc1) + charset.charAt(enc2);
            if (win.isNaN(byte2)) {
                output += "==";
            } else {
                output += charset.charAt(enc3);
                if (win.isNaN(byte3)) {
                    output += "=";
                } else {
                    output += charset.charAt(enc4);
                }
            }
        }

        return output;
    }

    function atob_pure(encodedStr) {
        const revCharset = {};
        for (let i = 0; i < charset.length; i++) {
            revCharset[charset[i]] = i;
        }

        const cleanStr = encodedStr.replace(/[^A-Za-z0-9+/]/g, "");
        const byteStream = [];
        for (let i = 0; i < cleanStr.length; i += 4) {
            const enc1 = revCharset[cleanStr.charAt(i)];
            const enc2 = revCharset[cleanStr.charAt(i + 1)];
            const enc3 = revCharset[cleanStr.charAt(i + 2)];
            const enc4 = revCharset[cleanStr.charAt(i + 3)];

            const byte1 = (enc1 << 2) | (enc2 >> 4);
            const byte2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            const byte3 = ((enc3 & 3) << 6) | enc4;

            byteStream.push(byte1);
            if (enc3 !== undefined && cleanStr.charAt(i + 2) !== '=') {
                byteStream.push(byte2);
            }
            if (enc4 !== undefined && cleanStr.charAt(i + 3) !== '=') {
                byteStream.push(byte3);
            }
        }

        let decodedStr = "";
        let i = 0;
        while (i < byteStream.length) {
            const byte1 = byteStream[i++];
            let charCode;

            if (byte1 < 0x80) {

                charCode = byte1;
            } else if ((byte1 & 0xE0) === 0xC0) {

                const byte2 = byteStream[i++];
                charCode = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F);
            } else if ((byte1 & 0xF0) === 0xE0) {

                const byte2 = byteStream[i++];
                const byte3 = byteStream[i++];
                charCode = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
            } else {

                const byte2 = byteStream[i++];
                const byte3 = byteStream[i++];
                const byte4 = byteStream[i++];
                charCode = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
            }

            decodedStr += win.String.fromCharCode(charCode);
        }

        return decodedStr;
    }

    // Basically the same localStorage, but being able to store data across different domains (moomoo.io, sandbox.moomoo.io, dev.moomoo.io)
    const sharedStorage = (() => {
        const DOMAIN = ".moomoo.io";
        const PATH = "/";
        const DEFAULT_MAX_AGE = 60 * 60 * 24 * 365;

        function setItem(key, value, options = {}) {
            const {
                maxAge = DEFAULT_MAX_AGE,
                secure = true,
                sameSite = "Lax"
            } = options;

            const encodedKey = encodeURIComponent(key);
            const encodedValue = encodeURIComponent(
                typeof value === "string" ? value : JSON.stringify(value)
            );

            let cookie = `${encodedKey}=${encodedValue}; domain=${DOMAIN}; path=${PATH}; max-age=${maxAge}; SameSite=${sameSite}`;
            if (secure) cookie += "; Secure";
            document.cookie = cookie;
        }

        function getItem(key) {
            const encodedKey = encodeURIComponent(key) + "=";
            const cookies = document.cookie.split("; ");

            for (const cookie of cookies) {
                if (cookie.startsWith(encodedKey)) {
                    const value = decodeURIComponent(cookie.substring(encodedKey.length));
                    try {
                        return JSON.parse(value);
                    } catch {
                        return value;
                    }
                }
            }
        }

        function removeItem(key) {
            const encodedKey = encodeURIComponent(key);
            document.cookie = `${encodedKey}=; domain=${DOMAIN}; path=${PATH}; max-age=0`;
        }

        function clear() {
            const cookies = document.cookie.split("; ");
            for (const cookie of cookies) {
                const key = cookie.split("=")[0];
                document.cookie = `${key}=; domain=${DOMAIN}; path=${PATH}; max-age=0`;
            }
        }

        return {
            setItem,
            getItem,
            removeItem,
            clear
        };
    })();

    const password_key = btoa_pure("password_key");
    let password_value = sharedStorage.getItem(password_key) || "";
    if (typeof password_value === "string" && password_value.length > 0) {
        password_value = atob_pure(password_value);
    }

    function getTimezoneOffset() {
        const currentYear = new win.Date().getFullYear();
        return win.Math.max(
            win.parseFloat(new win.Date(currentYear, 0, 1).getTimezoneOffset()),
            win.parseFloat(new win.Date(currentYear, 6, 1).getTimezoneOffset()),
        )
    }

    function getTimezone() {
        const DateTimeFormat = win.Intl?.DateTimeFormat;
        if (DateTimeFormat) {
            const timezone = new DateTimeFormat().resolvedOptions().timeZone;
            if (timezone) return timezone;
        }
        const offset = -getTimezoneOffset();
        return `UTC${offset >= 0 ? '+' : ''}${offset}`;
    }

    function detectEnvironment() {
        const ua = win.navigator.userAgent || "";
        const vendor = win.navigator.vendor || "";
        const platformStr = win.navigator.platform || "";
        const touch = win.navigator.maxTouchPoints || 0;

        const engine =
            /Trident|MSIE/.test(ua) ? "Trident" :
                /Gecko\/\d/.test(ua) && !/like Gecko/.test(ua) ? "Gecko" :
                    /AppleWebKit/.test(ua) ?
                        /Chrome|Chromium|Edg|OPR|Brave|Vivaldi/.test(ua) ?
                            "Blink" :
                            "WebKit" :
                        "Unknown";

        const browserName =
            win.navigator.brave?.isBrave ? "Brave" :
                /Edg\//.test(ua) ? "Edge" :
                    /OPR\//.test(ua) ? "Opera" :
                        /Vivaldi/.test(ua) ? "Vivaldi" :
                            /SamsungBrowser/.test(ua) ? "Samsung Internet" :
                                /UCBrowser/.test(ua) ? "UC Browser" :
                                    /Firefox\//.test(ua) ? "Firefox" :
                                        /Safari\//.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua) && vendor === "Apple Computer, Inc." ?
                                            "Safari" :
                                            /Chrome\//.test(ua) ? "Chrome" :
                                                /MSIE|Trident/.test(ua) ? "Internet Explorer" :
                                                    "Unknown";

        const os =
            /Windows NT 10\.0/.test(ua) ? "Windows 10/11" :
                /Windows NT 6\.3/.test(ua) ? "Windows 8.1" :
                    /Windows NT 6\.2/.test(ua) ? "Windows 8" :
                        /Windows NT 6\.1/.test(ua) ? "Windows 7" :
                            /Android/.test(ua) ? "Android" :
                                /iPhone/.test(ua) ? "iOS" :
                                    /iPad/.test(ua) || (platformStr === "MacIntel" && touch > 1) ? "iPadOS" :
                                        /Mac OS X/.test(ua) ? "macOS" :
                                            /CrOS/.test(ua) ? "Chrome OS" :
                                                /Linux/.test(ua) ? "Linux" :
                                                    /Tizen/.test(ua) ? "Tizen" :
                                                        /WebOS/.test(ua) ? "webOS" :
                                                            /PlayStation/.test(ua) ? "PlayStation OS" :
                                                                /Xbox/.test(ua) ? "Xbox OS" :
                                                                    /Nintendo/.test(ua) ? "Nintendo OS" :
                                                                        "Unknown";

        const platform =
            /TV|SmartTV|WebTV|AppleTV|GoogleTV|Tizen|Roku/.test(ua) ? "TV" :
                /PlayStation|Xbox|Nintendo/.test(ua) ? "Console" :
                    /iPad/.test(ua) || (platformStr === "MacIntel" && touch > 1) ? "Tablet" :
                        /Mobi|Android|iPhone|iPod/.test(ua) ? "Mobile" :
                            /wv/.test(ua) || (/Android/.test(ua) && /Version\/\d/.test(ua)) ? "Embedded" :
                                touch > 0 ? "Laptop" :
                                    "Desktop";

        return {
            browserName: browserName,
            engine: engine,
            os: os,
            platform: platform,
        }
    }

    function safeString(value) {
        if (typeof value === "string" && value.length > 0) {
            return value.trim();
        }

        return null;
    }

    function safeNumber(value) {
        if (typeof value === "number" && !win.isNaN(value) && win.isFinite(value)) {
            return value + "";
        }

        return "0";
    }

    function getDoNotTrack() {
        const dnt = win.navigator.doNotTrack;
        if (dnt === "1" || dnt === "yes" || dnt === true) {
            return "1";
        }
        return "0";
    }

    function getWebglInfo() {
        const canvas = win.document.createElement("canvas");
        const gl =
            canvas.getContext("webgl2") ||
            canvas.getContext("webgl") ||
            canvas.getContext("experimental-webgl");

        if (!gl) return null;

        const safe = (fn) => {
            try { return fn(); } catch { return null; }
        }

        const output = {
            version: safe(() => gl.getParameter(gl.VERSION)),
            shadingLanguageVersion: safe(() => gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
            renderer: safe(() => gl.getParameter(gl.RENDERER)),
            vendor: safe(() => gl.getParameter(gl.VENDOR)),
            unmaskedRenderer: null,
            unmaskedVendor: null,
        };

        const debugExt =
            gl.getExtension("RENDERER") ||
            gl.getExtension("WEBGL_debug_renderer_info") ||
            gl.getExtension("MOZ_WEBGL_debug_renderer_info") ||
            gl.getExtension("WEBKIT_WEBGL_debug_renderer_info");

        if (debugExt) {
            output.unmaskedRenderer = safe(() =>
                gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL)
            );
            output.unmaskedVendor = safe(() =>
                gl.getParameter(debugExt.UNMASKED_VENDOR_WEBGL)
            );
        }

        return output;
    }

    function canvasFingerprint() {
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 150;
        const ctx = canvas.getContext("2d");

        ctx.textBaseline = "top";
        ctx.font = "16px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(10, 10, 100, 40);
        ctx.fillStyle = "#069";
        ctx.fillText("canvas-fingerprint", 12, 15);
        ctx.strokeStyle = "rgba(102,204,0,0.7)";
        ctx.arc(80, 60, 40, 0, Math.PI * 2, true);
        ctx.stroke();

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let hash = 5381;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) + hash) ^ data[i];
        }
        return (hash >>> 0).toString(16);
    }

    win.Number.DELTA = 1;

    // Fingerprint collection
    // Used to verify and idenfity the user to prevent unauthorized access. This data is not saved anywhere and gets deleted immediately
    function getFingerprintData() {
        const output = {};

        output.userAgent = win.navigator.userAgent;
        output.timezone = getTimezone();
        output.timezoneOffset = safeNumber(-new win.Date().getTimezoneOffset() / 60);
        output.language = safeString(win.navigator.language);
        output.languages = safeString((win.navigator.languages || []).join(", "));
        output.platform = safeString(win.navigator.platform);

        output.pixelDepth = safeNumber(win.screen.pixelDepth);
        output.hardwareConcurrency = safeNumber(win.navigator.hardwareConcurrency);
        output.deviceMemory = safeNumber(win.navigator.deviceMemory);
        output.doNotTrack = getDoNotTrack();
        output.canvas = canvasFingerprint();

        output.webgl = null;

        try {
            output.webgl = getWebglInfo();
        } catch (err) { }

        const env = detectEnvironment();
        output.userPlatform = {
            browserName: env.browserName,
            engine: env.engine,
            os: env.os,
            platform: env.platform,
        };
        
        return btoa_pure(win.JSON.stringify(output));
    }
    
    const handleString = (str, key) => {
        let output = "";
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            const char = key.charCodeAt(i % key.length);
            output += win.String.fromCharCode(code ^ char);
        }
        return output;
    }
    
    const handleDecoding = (str, key) => {
        return btoa_pure(handleString(str, key));
    }

    const generateString = (len) => {
        let output = "";
        for (let i=0;i<=len;i++) {
            output += charset[random(0, charset.length - 1)];
        }
        return output;
    }
    
    // CALLED WHEN WE GOT OUR OBFUSCATED SOURCE CODE
    // THIS IS SUPPOSED TO VERIFY IF OUR CODE WAS EXECUTED VIA THIS LOADER
    const initHandshake = () => {
        const shakeKey = btoa_pure("shake_key_value");
        const shakeProp = generateString(15);
        win.localStorage[shakeKey] = btoa_pure(shakeProp);
        
        win[shakeProp] = function(encoded, key) {
            delete win.localStorage[shakeKey];
            if (win.localStorage[shakeKey] !== undefined) {
                while(true){}
                return;
            }
            
            win.Math.LN1 <<= 25;
            delete win[shakeProp];
            if (win[shakeProp] !== undefined) {
                while(true){}
                return;
            }
            return handleDecoding(atob_pure(encoded), atob_pure(key));
        }

        const source_key = btoa_pure("source_key");
        win[source_key] = function(encoded) {
            return createHash(atob_pure(encoded));
        }
    }
    
    function singletonFunction() {
        while(true){}
    }
    
    const encoder = new win.TextEncoder();
    const decoder = new win.TextDecoder();
    function xorCipherBuffer(content, key) {
        xorCipherBuffer = singletonFunction;
        
        const keyLength = key.length;
        const data = encoder.encode(content);
        const keyCodes = new win.Uint8Array(keyLength);
        for (let i = 0; i < keyLength; i++) {
            keyCodes[i] = key.charCodeAt(i);
        }
        for (let i = 0; i < data.length; i++) {
            data[i] ^= keyCodes[(i * (keyCodes[i % keyLength] + 1)) % keyLength];
        }
        return decoder.decode(data);
    }
    
    const fingerprint = getFingerprintData();
    const OWNER_ID = "{OWNER_ID}";
    const CRYPTO_KEY = "4d8edb32fad5fcbe99b7c4eec4d2afa16c857207a38e6a93f16fbbac15d8dc87";
    const baseURL = "https://auth-private-production.up.railway.app";
    
    // CHECK IF WE HAVE AN EXISTING TOKEN ACCESS
    const token_key = btoa_pure("token_key");
    const token_value = sharedStorage.getItem(token_key);
    if (typeof token_value === "string" && token_value.length > 0 && password_value.length === 6) {
        const data = {
            jwt_token: token_value,
            owner_id_hashed: OWNER_ID,
            password: password_value,
            fingerprint: fingerprint,
        }

        // Synchronous request is important for immediate source code injection, even tho it still works without one
        const loginData = btoa_pure(win.JSON.stringify(data));
        const xhr = new win.XMLHttpRequest();
        xhr.open("POST", baseURL + "/login", false);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.onload = () => {
            let passedCheck = false;
            if (xhr.status === 200) {
                const token = xhr.getResponseHeader("Authorization");
                if (token !== null) {
                    const codeBase = xorCipherBuffer(win.atob(xhr.responseText), CRYPTO_KEY);
                    if (typeof codeBase === "string" && codeBase.length > 0 && codeBase !== null) {
                        sharedStorage.setItem(token_key, token);
                        passedCheck = true;
                        initHandshake();
                        EVAL(win, codeBase);
                    }
                }
            }
            
            if (!passedCheck) {
                sharedStorage.removeItem(token_key);
                if (sharedStorage.getItem(token_key) !== undefined) {
                    while(true){}
                }

                if (res.status === 401) {
                    sharedStorage.removeItem(password_key);
                    if (sharedStorage.getItem(password_key) !== undefined) {
                        while(true){}
                    }
                }
                
                if (xhr.status !== 200) {
                    win.alert(xhr.responseText);
                }
                
                win.location.href = win.location.href;
                win.location.reload();
            }
        }
        xhr.send(loginData);
        
        return;
    }

    const stopPageExecution = () => {
        const observer = new win.MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.id === "mainMenu" || node instanceof HTMLScriptElement) {
                        node.remove();
                    }
                }
            }
        });
        observer.observe(win.document, { childList: true, subtree: true });
    }

    stopPageExecution();

    if (typeof access_token === "string" && access_token.length > 0) {
        if (typeof password_value !== "string" || password_value.length !== 6) {
            const input = win.prompt("ENTER PASSWORD");
            password_value = input.trim() || "";
        }
        
        const data = {
            discord_access_token: access_token,
            owner_id_hashed: OWNER_ID,
            password: password_value,
            fingerprint: fingerprint
        }

        const registerData = btoa_pure(win.JSON.stringify(data));
        (async () => {
            const res = await fetch(baseURL + "/register", {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: registerData
            });

            const token = res.headers.get("Authorization");
            const data = await res.text();
            if (res.status === 200 && token !== null) {
                sharedStorage.setItem(token_key, token);
                sharedStorage.setItem(password_key, btoa_pure(password_value));
            } else {
                sharedStorage.removeItem(token_key);
                if (sharedStorage.getItem(token_key) !== undefined) {
                    while(true){}
                }

                if (res.status === 401) {
                    sharedStorage.removeItem(password_key);
                    if (sharedStorage.getItem(password_key) !== undefined) {
                        while(true){}
                    }
                }

                win.alert(data);
            }

            win.location.href = win.location.href;
            win.location.reload();
        })();

        return;
    }
    
    // Verification is done via discord's oauth system, basically we get discord account ID and use it to verify the user
    // Without direct access, user won't be able to use the code
    const hostname = win.location.hostname;
    const authorizeLink = `https://discord.com/oauth2/authorize?client_id=1391284744020557865&response_type=token&redirect_uri=https%3A%2F%2F${hostname}%2F&scope=identify+guilds`;
    
    const injectMenu = () => {
        const div = win.document.createElement("div");
        div.style = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);

            width: 480px;
            height: 300px;
            background: #080808;
            z-index: 10;

            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 10px;
            border-radius: 6px;
            font-weight: 800;
            color: #f1f1f1;
        `;
        const header = win.document.createElement("div");
        header.style = `
            background: #121212;
            border-radius: 6px;
            padding: 10px;
        `;

        const headerText = win.document.createElement("h1");
        headerText.textContent = "Glotus Client Loader v{SCRIPT_VERSION}";
        headerText.style = `
            margin: 0;
            font-family: "Noto Sans", sans-serif;
            font-size: 30px;
            font-weight: 800;
            background: #121212;
        `;
        header.appendChild(headerText);
        div.appendChild(header);

        const main = win.document.createElement("div");
        main.style = `
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            background: #121212;

        `;

        const loginButton = win.document.createElement("a");
        loginButton.href = authorizeLink;
        loginButton.textContent = "Login via Discord";
        loginButton.style = `
            font-family: "Noto Sans", sans-serif;
            font-weight: 800;
            font-size: 2em;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #5865f2;
            color: #f1f1f1;
            padding: 10px;
            border-radius: 6px;
            cursor: pointer;
        `;
        main.appendChild(loginButton);
        div.appendChild(main);

        win.document.body.appendChild(div);
    }

    if (win.document.readyState !== "loading") {
        injectMenu();
        return;
    }

    win.document.addEventListener("DOMContentLoaded", injectMenu, { once: true });

})(
    // Important shit for JSConfuser, cuz it is not able to handle such global variables
    unsafeWindow = this.unsafeWindow || window.unsafeWindow || typeof unsafeWindow !== "undefined" ? unsafeWindow : undefined,
    GM_info = this.GM_info || window.GM_info || typeof GM_info !== "undefined" ? GM_info : undefined,
);