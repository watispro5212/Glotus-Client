import { clamp, lerp } from './../utility/Common';
import { isActiveInput } from "../utility/Common";
import Hooker from "../utility/Hooker";

const resizeEvent = new Event("resize");
const ZoomHandler = new class ZoomHandler {
    readonly _scale = {
        Default: {
            _w: 1920,
            _h: 1080,
        } as const,
        current: {
            _w: 1920,
            _h: 1080
        },
        _smooth: {
            _w: Hooker.linker(1920),
            _h: Hooker.linker(1080)
        } as const
    };

    getScale() {
        const dpr = 1;//window.devicePixelRatio;
        return Math.max(
            window.innerWidth / this._scale.Default._w,
            window.innerHeight / this._scale.Default._h
        ) * dpr;
    }

    tempScale = 1;
    handler(event: WheelEvent) {
        if (
            !(event.target instanceof HTMLCanvasElement) ||
            event.ctrlKey || event.shiftKey || event.altKey ||
            isActiveInput()
        ) return;

        const { Default, current } = this._scale;

        if (event.deltaY < 0) {
            this.tempScale *= 1.1;
        } else {
            this.tempScale /= 1.1;
        }
        this.tempScale = clamp(this.tempScale, 0.1, 22);
        const zoom = this.tempScale;
        current._w = Default._w * zoom;
        current._h = Default._h * zoom;
    }

    private renderStart = Date.now();
    smoothUpdate() {

        const { current, _smooth: smooth } = this._scale;
        const now = Math.sign((window.Number as any).DELTA) * Date.now();
        const delta = now - this.renderStart;
        this.renderStart = now;

        const dt = delta / 1000;
        const blend = (1 - Math.exp(-10 * dt)) * 0.4;
        smooth._w[0] = lerp(smooth._w[0], current._w, blend);
        smooth._h[0] = lerp(smooth._h[0], current._h, blend);
        window.dispatchEvent(resizeEvent);
    }
}

export default ZoomHandler;