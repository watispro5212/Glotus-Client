import type { TObject } from "../data/ObjectItem";
import type { TCTX } from "../types/Common";
import type { IRenderEntity } from "../types/RenderTargets";
import EntityRenderer from "./EntityRenderer";
import Renderer from "./Renderer";

export class Notify {
    readonly x: number;
    readonly y: number;
    private readonly timeout = {
        value: 0,
        max: 1500
    }

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    render(ctx: TCTX, player: IRenderEntity) {
        this.timeout.value += EntityRenderer.step;
        if (this.timeout.value >= this.timeout.max) {
            NotificationRenderer.remove(this);
            return;
        }

        Renderer.renderTracer(ctx, this, player);
    }
}

const NotificationRenderer = new class NotificationRenderer {
    readonly notifications = new Set<Notify>();

    remove(notify: Notify) {
        this.notifications.delete(notify);
    }

    add(object: TObject) {
        const { x, y } = object.pos.current;
        const notify = new Notify(x, y);
        this.notifications.add(notify);
    }

    render(ctx: TCTX, player: IRenderEntity) {
        for (const notification of this.notifications) {
            notification.render(ctx, player);
        }
    }
}

export default NotificationRenderer;