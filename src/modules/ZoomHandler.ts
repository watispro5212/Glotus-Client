import { clamp, lerp } from './../utility/Common';
import { isActiveInput } from "../utility/Common";
import Hooker from "../utility/Hooker";

function smoothstep(t: number) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
}
const resizeEvent = new Event("resize");
const ZoomHandler = new class ZoomHandler {
    readonly scale = {
        Default: {
            w: 1920,
            h: 1080,
        } as const,
        current: {
            w: 1920,
            h: 1080
        },
        smooth: {
            w: Hooker.linker(1920),
            h: Hooker.linker(1080)
        } as const
    };

    getScale() {
        const dpr = 1;//window.devicePixelRatio;
        return Math.max(
            window.innerWidth / this.scale.Default.w,
            window.innerHeight / this.scale.Default.h
        ) * dpr;
    }

    tempScale = 1;
    handler(event: WheelEvent) {
        if (
            !(event.target instanceof HTMLCanvasElement) ||
            event.ctrlKey || event.shiftKey || event.altKey ||
            isActiveInput()
        ) return;

        const { Default, current } = this.scale;

        if (event.deltaY < 0) {
            this.tempScale *= 1.1;
        } else {
            this.tempScale /= 1.1;
        }
        this.tempScale = clamp(this.tempScale, 0.1, 22);
        const zoom = this.tempScale;
        current.w = Default.w * zoom;
        current.h = Default.h * zoom;
    }

    smoothUpdate() {

        const { current, smooth } = this.scale;
        const blend = 0.09;
        smooth.w[0] = lerp(smooth.w[0], current.w, blend);
        smooth.h[0] = lerp(smooth.h[0], current.h, blend);
        window.dispatchEvent(resizeEvent);
    }
}

export default ZoomHandler;