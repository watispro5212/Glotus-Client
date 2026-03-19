import { isProd } from "..";
import Logger from "../utility/Logger";
import Regexer from "./Regexer";

const formatCode = (code: string) => {
    const Hook = new Regexer(code);

    if (!isProd) {
        Hook.code = `console?.log("Loaded bundle..");` + Hook.code;
    }

    Hook.append(
        "preRenderLoop",
        /\)\}\}\(\);function \w+\(\)\{/,
        `Glotus._Renderer._preRender();`
    );

    Hook.append(
        "postRenderLoop",
        /\w+,\w+\(\),requestAnimFrame\(\w+\)/,
        ";Glotus._Renderer._postRender();"
    );

    Hook.append(
        "mapPreRender",
        /(\w+)\.lineWidth=NUM{4};/,
        `Glotus._Renderer._mapPreRender($1);`
    );

    Hook.prepend(
        "gameInit",
        /function (\w+)\(\w+\)\{\w+\.\w+\(\w+,f/,
        "Glotus._gameInit=function(a){$1(a);};"
    );

    Hook.prepend(
        "LockRotationClient",
        /return \w+\?\(\!/,
        `return Glotus._myClient._ModuleHandler._currentAngle;`
    );

    Hook.replace(
        "DisableResetMoveDir",
        /\w+=\{\},\w+\.send\("\w+"\)/,
        ""
    );

    Hook.append(
        "offset",
        /\W170\W.+?(\w+)=\w+\-\w+\/2.+?(\w+)=\w+\-\w+\/2;/,
        `Glotus._offset._setXY($1,$2);`
    );

    Hook.prepend(
        "renderEntity",
        /\w+\.health>NUM{0}.+?(\w+)\.fillStyle=(\w+)==(\w+)/,
        `;Glotus._hooks._EntityRenderer._render($1,$2,$3);false&&`
    );

    Hook.append(
        "renderItemPush",
        /,(\w+)\.blocker,\w+.+?2\)\)/,
        `,Glotus._Renderer._renderObjects.push($1)`
    );

    Hook.append(
        "renderItem",
        /70, 0.35\)",(\w+).+?\w+\)/,
        `,Glotus._hooks._ObjectRenderer._render($1)`
    );

    Hook.append(
        "RemoveSendAngle",
        /clientSendRate\)/,
        `&&false`
    );

    Hook.replace(
        "handleEquip",
        /\w+\.send\("\w+",0,(\w+),(\w+)\)/,
        `Glotus._myClient._ModuleHandler._equip($2,$1,true,true)`
    );

    Hook.replace(
        "handleBuy",
        /\w+\.send\("\w+",1,(\w+),(\w+)\)/,
        `Glotus._myClient._ModuleHandler._buy($2,$1,true)`
    );

    Hook.prepend(
        "RemovePingCall",
        /\w+&&clearTimeout/,
        "return;"
    );

    Hook.append(
        "RemovePingState",
        /let \w+=-1;function \w+\(\)\{/,
        "return;"
    )

    Hook.prepend(
        "preRender",
        /(\w+)\.lineWidth=NUM{4},/,
        `Glotus._hooks._ObjectRenderer._preRender($1);`
    );
    
    Hook.replace(
        "RenderGrid",
        /("#91b2db".+?)(for.+?)(\w+\.stroke)/,
        "$1$3"
    )

    Hook.replace(
        "upgradeItem",
        /(upgradeItem.+?onclick.+?)\w+\.send\("\w+",(\w+)\)\}/,
        "$1Glotus._myClient._ModuleHandler._upgradeItem($2)}"
    );

    const data = Hook.match("DeathMarker", /99999.+?(\w+)=\{x:(\w+)/);
    Hook.append(
        "playerDied",
        /NUM{99999};function \w+\(\)\{/,
        `if(Glotus._settings._autospawn){${data[1]}={x:${data[2]}.x,y:${data[2]}.y};return};`
    );

    Hook.append(
        "updateNotificationRemove",
        /\w+=\[\],\w+=\[\];function \w+\(\w+,\w+\)\{/,
        `return;`
    );

    Hook.replace(
        "checkTrusted",
        /checkTrusted:(\w+)/,
        `checkTrusted:(callback)=>(event)=>callback(event)`
    );

    Hook.replace(
        "removeSkins",
        /(\(\)\{)(let \w+="";for\(let)/,
        "$1return;$2"
    );

    Hook.prepend(
        "unlockedItems",
        /\w+\.list\[\w+\]\.pre==/,
        "true||"
    );

    Hook.replace(
        "gameColor",
        /rgba\(0, 0, 70, 0.35\)/,
        "rgba(23, 6, 62, 0.6)"
    );

    Hook.prepend(
        "renderPlayer",
        /function (\w+)\(\w+,\w+\)\{\w+=\w+\|\|\w+,/,
        "Glotus._hooks._renderPlayer=$1;"
    );

    Hook.replace(
        "maskFRVR",
        /window\.FRVR/,
        "FRVR",
        "g"
    );

    Hook.replace(
        "scaleWidth",
        /=1920/,
        `=Glotus._ZoomHandler._scale._smooth._w`
    );

    Hook.replace(
        "scaleHeight",
        /=1080/,
        `=Glotus._ZoomHandler._scale._smooth._h`
    );

    Hook.replace(
        "maskLerp",
        /Math\.lerpAngle/,
        "THIS_STORAGE.lerpAngle",
        "g",
    );

    const addCode = isProd ? "const Glotus=window.Glotus;delete window.Glotus;" : "";
    Hook.wrap(`(function THIS_STORAGE(){const FRVR=window.FRVR;delete window.FRVR;${addCode}`, `})();`);

    Logger.test(`Modified bundle, total amount of hooks: ${Hook.hookCount}/${Hook.hookAttempts}`);
    return Hook.code;
}

export default formatCode;