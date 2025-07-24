import { isProd } from "..";
import formatCode from "./formatCode";

const Injector = new class Injector {

    init(node: HTMLScriptElement) {
        this.loadScript(node.src);
    }

    /** Fetches game bundle by src, modifies it and injects back to the DOM */
    private loadScript(src: string) {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", src, false);
        xhr.send();
        
        const code = formatCode(xhr.responseText);
        if (isProd) {
            this.waitForBody(() => {
                Function(code)();
            });
        } else {
            const blob = new Blob([code], { type: "text/plain" });
            const element = document.createElement("script");
            element.src = URL.createObjectURL(blob);
            this.waitForBody(() => {
                document.head.appendChild(element);
            });
        }
    }

    private waitForBody(callback: () => void) {
        if (document.readyState !== "loading") {
            callback();
            return;
        }
        document.addEventListener("readystatechange", () => {
            if (document.readyState !== "loading") {
                callback();
            }
        }, { once: true });
    }
}

export default Injector;