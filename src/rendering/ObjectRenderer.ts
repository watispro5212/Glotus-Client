import { Items } from "../constants/Items";
import { PlayerObject, type TObject } from "../data/ObjectItem";
import type { TCTX } from "../types/Common";
import { EItem, ItemType } from "../types/Items";
import type { IRenderObject } from "../types/RenderTargets";
import settings from "../utility/Settings";
import Vector from "../modules/Vector";
import Renderer from "./Renderer";
import { client, Glotus } from "..";
import ZoomHandler from "../modules/ZoomHandler";
import { DeadPlayerHandler } from "../modules/DeadPlayer";

/**
 * Called when game bundle rendering objects
 */
const ObjectRenderer = new class ObjectRenderer {
    private healthBar(ctx: TCTX, entity: IRenderObject, object: PlayerObject): number {
        if (!(settings._itemHealthBar &&
            object.seenPlacement &&
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
            entity.turnSpeed = 0;
        }
    }

    private renderCollisions(ctx: TCTX, entity: IRenderObject, object: TObject) {
        const x = entity.x + entity.xWiggle;
        const y = entity.y + entity.yWiggle;
        if (settings._collisionHitbox) {
            Renderer.circle(ctx, x, y, object.collisionScale, "#c7fff2", 0.5, 1);
            Renderer.rect(ctx, new Vector(x, y), object.collisionScale, "#ecffbd", 1, 0.5);
        }
        if (settings._weaponHitbox) Renderer.circle(ctx, x, y, object.hitScale, "#3f4ec4", 0.5, 1);
        if (settings._placementHitbox) Renderer.circle(ctx, x, y, object.placementScale, "#73b9ba", 0.5, 1);

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

        // if (object instanceof PlayerObject && object.trapActivated) {
        //     const scale = object.scale * 0.3;
        //     Renderer.fillCircle(ctx, x, y, scale, "#364cc9ff", 0.3);
        // }

        // const spikeCollider = client.EnemyManager.spikeCollider;
        // if (spikeCollider === object) {
        //     const scale = spikeCollider.collisionScale;
        //     Renderer.fillCircle(ctx, x, y, scale, "#bf3d59", 0.2);

        //     const nearestEnemySpikeCollider = client.EnemyManager.nearestEnemySpikeCollider;
        //     if (nearestEnemySpikeCollider !== null) {
        //         const scale = nearestEnemySpikeCollider.collisionScale;
        //         Renderer.fillCircle(ctx, x, y, scale, "#bf3d59", 0.2);
        //     }
        // }

        if (object instanceof PlayerObject && object.canBeDestroyed) {
            Renderer.fillCircle(ctx, x, y, 10, "#f88a41ff", 0.3);
        }
        
        // const nearestLowHPObject = client.EnemyManager.nearestLowHPObject;
        // if (nearestLowHPObject === object) {
        //     Renderer.fillCircle(ctx, x, y, 12, "red", 1);
        // }

    }

    _render(ctx: TCTX) {
        if (Renderer._renderObjects.length === 0) return;

        const { ObjectManager, _ModuleHandler: ModuleHandler, myPlayer: myPlayer } = client;
        for (const entity of Renderer._renderObjects) {
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
        Renderer._renderObjects.length = 0;
    }

    private readonly volcanoBoxSize = 1880 / 2;
    private readonly volcanoAggressionRadius = 1440;
    private readonly volcanoBoxPos = new Vector(14400, 14400).sub(this.volcanoBoxSize);
    private readonly volcanoPos = new Vector(13960, 13960);

    _preRender(ctx: TCTX) {
        // Renderer.rect(ctx, this.volcanoBoxPos, this.volcanoBoxSize, "red", 1, 0.5);
        // Renderer.circle(ctx, this.volcanoPos.x, this.volcanoPos.y, this.volcanoAggressionRadius, "red", 1, 0.4);
        
        const offsetX = Glotus._offset.x;
        const offsetY = Glotus._offset.y;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "red";
        ctx.translate(-offsetX, -offsetY);
        ctx.beginPath();
        ctx.arc(this.volcanoPos.x, this.volcanoPos.y, this.volcanoAggressionRadius, 2.831070818924026, 5.022910815050457);

        const size = this.volcanoBoxSize;
        const x = this.volcanoBoxPos.x - size;
        const y = this.volcanoBoxPos.y - size;
        ctx.moveTo(x, y);
        ctx.lineTo(x + size * 2, y);
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + size * 2);
        ctx.stroke();
        ctx.restore();

        if (client.myPlayer.diedOnce) {
            const { x, y } = client.myPlayer.deathPosition;
            Renderer.cross(ctx, x, y, 50, 15, "#cc5151");
        }

        if (settings._positionPrediction && client.myPlayer.inGame) {
            DeadPlayerHandler.render(
                ctx,
                client.myPlayer.simulation.getPos(),
                client.myPlayer.simulation.spikeCollision ? "red" : "yellow"
            );
        }
    }
}

export default ObjectRenderer;