import type { TCTX } from "../types/Common";
import type { IRenderEntity } from "../types/RenderTargets";
import Renderer from "./Renderer";
import DataHandler from "../utility/DataHandler";
import { Items, Weapons } from "../constants/Items";
import Vector from "../modules/Vector";
import settings from "../utility/Settings";
import Animals, { EAnimal } from "../constants/Animals";
import { EDanger } from "../types/Enums";
import { client } from "..";
import NotificationRenderer from "./NotificationRenderer";
import { getAngle } from "../utility/Common";
import { DeadPlayerHandler } from "../modules/DeadPlayer";

const colors = [["orange", "red"], ["aqua", "blue"]] as const;

/** Called when bundle rendering entities (player, animal) */
const EntityRenderer = new class EntityRenderer {
    private start = Date.now();
    step = 0;

    private drawWeaponHitbox(ctx: TCTX, player: IRenderEntity) {
        if (!settings._weaponHitbox) return;

        const { myPlayer: myPlayer } = client;
        const current = myPlayer.weapon.current;
        if (DataHandler.isMelee(current)) {
            const weapon = DataHandler.getWeapon(current);
            Renderer.circle(ctx, player.x, player.y, weapon.range, "#f5cb42", 0.5, 1);
        }
    }

    private drawPlacement(ctx: TCTX) {
        if (!settings._possiblePlacement) return;
        const { myPlayer: myPlayer, _ModuleHandler: ModuleHandler } = client;
        const [ type, angles ] = ModuleHandler.placeAngles;
        if (type === null || angles === null) return;

        const id = myPlayer.getItemByType(type)!;
        if (id === null) return;
        
        const dist = myPlayer.getItemPlaceScale(id);
        const item = Items[id];
        for (let i=0;i<angles.length;i++) {
            const angle = angles[i]!;
            const pos = myPlayer.pos.current.addDirection(angle, dist);
            Renderer.circle(ctx, pos.x, pos.y, item.scale, "#80edf2", 0.4, 1);
        }
    }

    private drawEntityHP(ctx: TCTX, entity: IRenderEntity) {
        Renderer.renderBar(ctx, entity);
        Renderer.renderHP(ctx, entity);
    }

    private drawHitScale(ctx: TCTX, entity: IRenderEntity) {
        if (!settings._weaponHitbox) return;

        const { PlayerManager } = client;
        const type = entity.isPlayer ? PlayerManager.playerData : PlayerManager.animalData;
        const target = type.get(entity.sid);
        if (target !== undefined) {
            Renderer.circle(ctx, entity.x, entity.y, target.hitScale, "#3f4ec4", 0.5, 1);
        }

        if (entity.isAI && entity.index === EAnimal.MOOSTAFA) {
            const moostafa = Animals[EAnimal.MOOSTAFA];
            Renderer.circle(ctx, entity.x, entity.y, moostafa.hitRange, "#f5cb42", 0.5, 1);
        }
    }

    private drawDanger(ctx: TCTX, entity: IRenderEntity) {

        const { PlayerManager } = client;
        if (entity.isPlayer) {
            const player = PlayerManager.playerData.get(entity.sid);
            if (player !== undefined && player.danger !== 0) {
                const isBoost = Number(player.usingBoost) as 0 | 1;
                const isDanger = Number(player.danger >= EDanger.HIGH) as 0 | 1;
                Renderer.fillCircle(ctx, entity.x, entity.y, player.scale, colors[isBoost][isDanger], 0.3);
            }
        }

        if (entity.isAI) {
            const animal = PlayerManager.animalData.get(entity.sid);
            if (animal) {
                const color = animal.isDanger ? "red" : "green";
                Renderer.fillCircle(ctx, entity.x, entity.y, animal.attackRange, color, 0.3);
            }
        }
    }

    _render(ctx: TCTX, entity: IRenderEntity, player: IRenderEntity) {
        
        const { myPlayer: myPlayer, EnemyManager, _ModuleHandler: ModuleHandler, ObjectManager, InputHandler } = client;
        const isMyPlayer = entity === player;
        const pos = new Vector(entity.x, entity.y);
        if (isMyPlayer) {
            const now = Date.now();
            this.step = now - this.start;
            this.start = now;

            if (settings._displayPlayerAngle) {
                Renderer.line(ctx, pos, pos.addDirection(client.myPlayer.angle, 70), "#e9adf0");
            }

            this.drawWeaponHitbox(ctx, player);
            this.drawPlacement(ctx);

            if (myPlayer.isTrapped) {
                Renderer.fillCircle(ctx, pos.x, pos.y, 35, "yellow", 0.5);
            }

            const { pushPos } = ModuleHandler.staticModules.autoPush;
            const nearestPushSpike = client.EnemyManager.nearestPushSpike;
            if (pushPos !== null && nearestPushSpike !== null) {
                Renderer.line(ctx, pos, pushPos, "white", 0.6, 1);
                Renderer.line(ctx, pushPos, nearestPushSpike.pos.current, "white", 0.6, 1);
            }

            // const nearestObject = EnemyManager.nearestPlayerObject;
            // if (nearestObject !== null) {
            //     const pos1 = myPlayer.pos.current;
            //     const pos2 = nearestObject.pos.current;
            //     const distance = pos1.distance(pos2);
            //     const angle = pos1.angle(pos2);
            //     const offset = Math.asin((2 * nearestObject.scale) / (2 * distance));
            //     const lookingAt = getAngleDist(angle, myPlayer.angle) <= offset;
            //     Renderer.fillCircle(ctx, pos.x, pos.y, 10, lookingAt ? "red" : "white", 1);
            // }
        }

        this.drawEntityHP(ctx, entity);
        if (settings._collisionHitbox) {
            Renderer.circle(ctx, entity.x, entity.y, entity.scale, "#c7fff2", 0.5, 1);
        }

        if (!isMyPlayer) {
            this.drawHitScale(ctx, entity);
            Renderer.renderTracer(ctx, entity, player);
            Renderer.renderDistance(ctx, entity, player);

            const x = entity.x;
            const y = entity.y;
            const nearestEnemyToNearestEnemy = EnemyManager.nearestEnemyToNearestEnemy;
            if (nearestEnemyToNearestEnemy !== null && !entity.isAI && entity.sid === nearestEnemyToNearestEnemy.id) {
                Renderer.fillCircle(ctx, x, y, 35, "#48f072", 0.5);
            } else {
                this.drawDanger(ctx, entity);
            }

            // if (settings._knockbackTarget && client.myPlayer.inGame) {
            //     const spikeCollider = client.EnemyManager.spikeCollider;
            //     const nearestEnemySpikeCollider = client.EnemyManager.nearestEnemySpikeCollider;
            //     if (nearestEnemySpikeCollider !== null && nearestEnemySpikeCollider.id === entity.sid && spikeCollider !== null) {
            //         Renderer.fillCircle(
            //             ctx, x, y, nearestEnemySpikeCollider.collisionScale, "#bf3d59", 0.3
            //         );

            //         Renderer.fillCircle(
            //             ctx, spikeCollider.pos.current.x, spikeCollider.pos.current.y, spikeCollider.collisionScale, "#bf3d59", 0.3
            //         );

            //         Renderer.line(ctx, pos, spikeCollider.pos.current, "#451717", 1, 3);
            //     }
            // }

            // const nearestEnemyPush = EnemyManager.nearestEnemyPush;
            // if (
            //     nearestEnemyPush &&
            //     !entity.isAI &&
            //     entity.sid === nearestEnemyPush.id
            // ) {
            //     Renderer.fillCircle(ctx, entity.x, entity.y, 10, "red");
            // }
        }

        if (isMyPlayer) {
            NotificationRenderer.render(ctx, player);
        }

        const instakillTarget = InputHandler.instakillTarget;
        if (entity.isPlayer && instakillTarget !== null && entity.sid === instakillTarget.id) {
            Renderer.drawTarget(ctx, entity);

            const { bowInsta } = ModuleHandler.staticModules;
            if (bowInsta.active) {
                Renderer.circle(ctx, entity.x, entity.y, bowInsta.distMin, "#eda0ee", 0.4, 1);
                Renderer.circle(ctx, entity.x, entity.y, bowInsta.distMax, "#eda0ee", 0.4, 1);
            }
        }

        const { target: velTickTarget, minKB, maxKB } = ModuleHandler.staticModules.velocityTick;
        if (entity.isPlayer && velTickTarget !== null && entity.sid === velTickTarget.id) {
            const diff = Math.abs(maxKB - minKB);
            const length = minKB + (maxKB - minKB) / 2;
            const angle = getAngle(entity.x, entity.y, player.x, player.y);
            const posX = entity.x + Math.cos(angle) * length;
            const posY = entity.y + Math.sin(angle) * length;
            Renderer.circle(ctx, posX, posY, diff, "#e25176", 0.5, 1);
        }
    }
}

export default EntityRenderer;