// ==UserScript==
// @name            !!! Glotus Client PRIVATE [Moomoo.io]
// @author          Murka
// @description     An excellent Moomoo.io hack for a comfortable gaming experience
// @icon            https://i.imgur.com/rlMQW2P.png
// @version         {SCRIPT_VERSION}
// @match           *://moomoo.io/
// @match           *://moomoo.io/?server*
// @match           *://*.moomoo.io/
// @match           *://*.moomoo.io/?server*
// @run-at          document-start
// @grant           none
// @license         MIT
// @namespace       https://github.com/Murka007/Glotus-client
// ==/UserScript==
/* jshint esversion:6 */

/*
    Author: Murka
    Github: https://github.com/Murka007/Glotus-client
    Greasyfork: https://greasyfork.org/users/919633
    Discord: https://discord.gg/cPRFdcZkeD

    Version: {SCRIPT_VERSION}
    Built Time: {BUILD_TIME}
    Works On: {WORKS_ON}
    Build Hash: {HASH}

    Additional protection for the source code. Used only in production with a direct <-> loader connection
*/

(function(WINDOW, GM_info, unsafeWin) {
    (function() {
        WINDOW.Math.LN1 >>>= 21;
        const _console = WINDOW.console;
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
                while(true){}
            }
        }
    })();

    (function() {
        const keydownHandler = (event) => {
            const { code, ctrlKey, shiftKey } = event;
            if (
                ctrlKey && shiftKey &&
                (code === "KeyI" || code === "KeyJ" || code === "KeyM") ||
                code === "F12" ||
                ctrlKey && code === "KeyU"
            ) {
                event.preventDefault();
                while(true){}
            }
        }

        const contextmenuHandler = (event) => {
            event.preventDefault();
        }

        const handleTarget = (target) => {
            target.addEventListener("keydown", keydownHandler);
            target.addEventListener("contextmenu", contextmenuHandler);
            target.oncontextmenu = contextmenuHandler;
        }

        const targets = [ window, document ];
        for (const target of targets) {
            handleTarget(target);
        }
        WINDOW.Math.LN1 &= 65432;

        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node instanceof HTMLElement) {
                        handleTarget(node);
                    }
                }
            }
        });
        observer.observe(document, { childList: true, subtree: true });
    })();

    const random = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    const EVAL = (scope, code) => {
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

    WINDOW.addEventListener("blur", () => callDebugger(WINDOW));
    if (!callDebugger(WINDOW) || !injectedDebugger) {
        while(true){}
        return;
    }

    WINDOW.setInterval(() => {
        if (!callDebugger(WINDOW)) {
            while(true){}
        }
    }, random(4000, 5000));

    if (GM_info !== null || unsafeWin !== null) {
        while(true){}
        return;
    }

    let isRightDomain = false;
    try {
        if (/moomoo\.io/.test(WINDOW.location.hostname)) {
            isRightDomain = true;
        }
    } catch(err) {
        while(true){}
        return;
    }

    if (!isRightDomain) {
        while(true){}
        return;
    }

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
            if (WINDOW.isNaN(byte2)) {
                output += "==";
            } else {
                output += charset.charAt(enc3);
                if (WINDOW.isNaN(byte3)) {
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

            decodedStr += WINDOW.String.fromCharCode(charCode);
        }

        return decodedStr;
    }

    const generateString = (len) => {
        let output = "";
        for (let i=0;i<=len;i++) {
            output += charset[random(0, charset.length - 1)];
        }
        return output;
    }

    const handleString = (str, key) => {
        let output = "";
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            const char = key.charCodeAt(i % key.length);
            output += String.fromCharCode(code ^ char);
        }
        return output;
    }

    // INITIALIZE DEFAULT STRING AND ENCODING/DECODING KEY FOR THIS STRING
    const initialStr = generateString(100);
    const initialKey = generateString(100);

    // ENCODED STRING
    const encoded = handleString(initialStr, initialKey);

    // CHECK IF IIFE PROVIDED WINDOW
    if (WINDOW === undefined) {
        while(true){}
        return;
    }

    // GET KEY IN LOCALSTORAGE THAT IS USED FOR CALLBACK
    const shakeKey = btoa_pure("shake_key_value");
    const shakeValue = WINDOW.localStorage[shakeKey];
    if (typeof shakeValue !== "string") {
        while(true){}
        return;
    }

    // CHECK IF "SHAKE" FUNCTION ACTUALLY EXISTS AND SUCCESSFULLY DECODED OUR ENCODED STRING
    // ALL SUPPORTED BY PURE ATOB AND BTOA. IF USER WOULD BE ABLE TO DEOBFUSCATE OUR CODE HE WOULD GET ACCESS TO THEM AND DECODE IT
    const shakeProp = atob_pure(shakeValue);
    if (
        typeof WINDOW[shakeProp] !== "function" ||
        atob_pure(WINDOW[shakeProp](btoa_pure(encoded), btoa_pure(initialKey))) !== initialStr
    ) {
        while(true){}
        return;
    }

    // WHEN WE CHECKED FOR SUCCESSFUL DECODING, MAKE SURE EVERYTHING WERE DELETED AS IN LOADER CODE
    if (WINDOW[shakeProp] !== undefined || WINDOW.localStorage[shakeKey] !== undefined) {
        while(true){}
        return;
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

    try {
        const source_key = btoa_pure("source_key");
        const random_key = generateString(30);
        if (typeof WINDOW[source_key] !== "function") {
            while(true){}
            return;
        }

        if (WINDOW[source_key](btoa_pure(random_key)) !== createHash(random_key)) {
            while(true){}
            return;
        }

        WINDOW[source_key] = undefined;
        delete WINDOW[source_key];
        if (WINDOW[source_key] !== undefined) {
            while(true){}
            return;
        }

        WINDOW.Math.LN1 ^= 116;
    } catch(err) {
        while(true){}
        return;
    }

{CODE}

})(
    window,
    GM_info = this.GM_info || window.GM_info || typeof GM_info !== "undefined" ? GM_info : null,
    unsafeWindow = this.unsafeWindow || window.unsafeWindow || typeof unsafeWindow !== "undefined" ? unsafeWindow : null
);