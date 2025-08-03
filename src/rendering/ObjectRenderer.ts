import { Items } from "../constants/Items";
import { PlayerObject, type TObject } from "../data/ObjectItem";
import type { TCTX } from "../types/Common";
import { EItem, ItemType } from "../types/Items";
import type { IRenderObject } from "../types/RenderTargets";
import settings from "../utility/Settings";
import Vector from "../modules/Vector";
import Renderer from "./Renderer";
import { client } from "..";
import ZoomHandler from "../modules/ZoomHandler";

/**
 * Called when game bundle rendering objects
 */
const ObjectRenderer = new class ObjectRenderer {
    private healthBar(ctx: TCTX, entity: IRenderObject, object: PlayerObject): number {
        if (!(settings._itemHealthBar &&
            // object.seenPlacement &&
            object.isDestroyable
        )) return 0;

        const { health, maxHealth, angle } = object;
        const perc = health / maxHealth;
        const color = settings._itemHealthBarColor;
        return Renderer.circularBar(ctx, entity, perc, angle, color);
    }

    private renderTurret(ctx: TCTX, entity: IRenderObject, object: PlayerObject, scale: number) {
        if (object.type !== EItem.TURRET) return;

        if (settings._objectTurretReloadBar) {
            const { reload, maxReload, angle } = object;
            const perc = reload / maxReload;
            const color = settings._objectTurretReloadBarColor;
            Renderer.circularBar(ctx, entity, perc, angle, color, scale);
        }
    }

    private renderWindmill(entity: IRenderObject) {
        const item = Items[entity.id]!;
        if (item.itemType === ItemType.WINDMILL) {
            entity.turnSpeed = settings._windmillRotation ? item.turnSpeed : 0;
        }
    }

    private renderCollisions(ctx: TCTX, entity: IRenderObject, object: TObject) {
        const x = entity.x + entity.xWiggle;
        const y = entity.y + entity.yWiggle;
        if (settings._collisionHitbox) {
            Renderer.circle(ctx, x, y, object.collisionScale, "#c7fff2", 1, 1);
            Renderer.rect(ctx, new Vector(x, y), object.collisionScale, "#ecffbd", 1);
        }
        if (settings._weaponHitbox) Renderer.circle(ctx, x, y, object.hitScale, "#3f4ec4", 1, 1);
        // if (settings._placementHitbox) Renderer.circle(ctx, x, y, object.placementScale, "#13d16f", 1, 1);
        if (settings._placementHitbox) Renderer.circle(ctx, x, y, object.placementScale, "#73b9ba", 1, 1);

        const nearestCollider = client.EnemyManager.nearestCollider;
        if (nearestCollider === object) {
            const scale = nearestCollider.scale * 0.1;
            Renderer.fillCircle(ctx, x, y, scale, "#b53f6b", 0.4);
        }

        // const nearestEnemyObject = client.EnemyManager.nearestEnemyObject;
        // if (nearestEnemyObject === object) {
        //     const scale = nearestEnemyObject.collisionScale * 0.4;
        //     Renderer.fillCircle(ctx, x, y, scale, "#52ccafff", 0.5);
        // }

        // const secondNearestEnemyObject = client.EnemyManager.secondNearestEnemyObject;
        // if (secondNearestEnemyObject === object) {
        //     const scale = secondNearestEnemyObject.collisionScale * 0.4;
        //     Renderer.fillCircle(ctx, x, y, scale, "#b432a7ff", 0.5);
        // }

        if (object instanceof PlayerObject && object.trapActivated) {
            const scale = object.scale * 0.3;
            Renderer.fillCircle(ctx, x, y, scale, "#364cc9ff", 0.5);
        }

        const spikeCollider = client.EnemyManager.spikeCollider || client.EnemyManager.nearestSpike;
        if (spikeCollider === object) {
            const scale = spikeCollider.scale * 0.3;
            Renderer.fillCircle(ctx, x, y, scale, "#bf3d59", 0.5);
        }
        if (object instanceof PlayerObject && object.canBeDestroyed) {
            Renderer.fillCircle(ctx, x, y, 10, "#e76c1aff", 0.7);
        }
    }

    render(ctx: TCTX) {
        if (Renderer.renderObjects.length === 0) return;

        const { ObjectManager, ModuleHandler, myPlayer } = client;
        for (const entity of Renderer.renderObjects) {
            const object = ObjectManager.objects.get(entity.sid);
            if (object === undefined) continue;
            Renderer.renderMarker(ctx, entity);

            if (object instanceof PlayerObject) {
                const scale = this.healthBar(ctx, entity, object);
                this.renderTurret(ctx, entity, object, scale);
                this.renderWindmill(entity);
            }
            this.renderCollisions(ctx, entity, object);
            
            // if (ModuleHandler.colls.includes(object.id)) {
            //     Renderer.fillCircle(ctx, entity.x, entity.y, object.placementScale, "red", 0.2);
            //     Renderer.renderText(ctx, myPlayer.pos.current.distance(object.pos.current) + "", entity.x, entity.y, 12);
            // }
        }
        Renderer.renderObjects.length = 0;
    }

    private readonly volcanoSize = 1880 / 2;
    private readonly volcanoPos = new Vector(14400, 14400).sub(this.volcanoSize);

    preRender(ctx: TCTX) {
        Renderer.rect(ctx, this.volcanoPos, this.volcanoSize, "red", 1, 0.5);

        if (client.myPlayer.diedOnce) {
            const { x, y } = client.myPlayer.deathPosition;
            Renderer.cross(ctx, x, y, 50, 15, "#cc5151");
        }
    }
}

export default ObjectRenderer;