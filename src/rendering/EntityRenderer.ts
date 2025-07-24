import type { TCTX } from "../types/Common";
import type { IRenderEntity } from "../types/RenderTargets";
import Renderer from "./Renderer";
import DataHandler from "../utility/DataHandler";
import { Items, Weapons } from "../constants/Items";
import Vector from "../modules/Vector";
import settings from "../utility/Settings";
import { EHat } from "../types/Store";
import Animals, { EAnimal } from "../constants/Animals";
import { EDanger } from "../types/Enums";
import { ItemType } from "../types/Items";
import { client } from "..";
import NotificationRenderer from "./NotificationRenderer";

const colors = [["orange", "red"], ["aqua", "blue"]] as const;

/** Called when bundle rendering entities (player, animal) */
const EntityRenderer = new class EntityRenderer {
    private start = Date.now();
    step = 0;

    private drawWeaponHitbox(ctx: TCTX, player: IRenderEntity) {
        if (!settings._weaponHitbox) return;

        const { myPlayer, ModuleHandler } = client;
        const current = myPlayer.getItemByType(ModuleHandler.weapon);
        if (DataHandler.isMelee(current)) {
            const weapon = DataHandler.getWeapon(current);
            Renderer.circle(ctx, player.x, player.y, weapon.range, "#f5cb42", 1, 1);
        }
    }

    private drawPlacement(ctx: TCTX) {
        if (!settings._possiblePlacement) return;
        const { myPlayer, EnemyManager, ObjectManager, ModuleHandler } = client;
        const [type, angles] = ModuleHandler.staticModules.autoPlacer.placeAngles;
        if (type === null) return;

        const id = myPlayer.getItemByType(type)!;

        // const id = myPlayer.getItemByType(ItemType.TRAP);
        if (id === null) return;
        // const enemy = EnemyManager.nearestEnemy;
        // let targetAngle: number | null = null;
        // if (enemy !== null) {
        //     const pos1 = myPlayer.position.future;
        //     const pos2 = enemy.position.future;
        //     const dist = pos1.distance(pos2);
        //     if (dist < 300) targetAngle = pos1.angle(pos2);
        // }
        // const angles = ObjectManager.getBestPlacementAngles(myPlayer.position.current.copy(), id, targetAngle);
        const dist = myPlayer.getItemPlaceScale(id);
        const item = Items[id];
        for (let i=0;i<angles.length;i++) {
            const angle = angles[i]!;
            const pos = myPlayer.pos.current.addDirection(angle, dist);
            Renderer.circle(ctx, pos.x, pos.y, item.scale, "#80edf2", 0.6, 1);
        }
    }

    private drawEntityHP(ctx: TCTX, entity: IRenderEntity) {
        if (entity.isPlayer) {
            if (settings._turretHitbox && client.myPlayer.hatID === EHat.TURRET_GEAR) {
                Renderer.circle(ctx, entity.x, entity.y, 700, "#3e2773", 1, 1);
            }
        }
        Renderer.renderBar(ctx, entity);
        Renderer.renderHP(ctx, entity);
    }

    private drawHitScale(ctx: TCTX, entity: IRenderEntity) {
        if (!settings._weaponHitbox) return;

        const { PlayerManager } = client;
        const type = entity.isPlayer ? PlayerManager.playerData : PlayerManager.animalData;
        const target = type.get(entity.sid);
        if (target !== undefined) {
            Renderer.circle(ctx, entity.x, entity.y, target.hitScale, "#3f4ec4", 1, 1);
        }

        if (entity.isAI && entity.index === EAnimal.MOOSTAFA) {
            const moostafa = Animals[EAnimal.MOOSTAFA];
            Renderer.circle(ctx, entity.x, entity.y, moostafa.hitRange, "#f5cb42", 1, 1);
        }
    }

    private drawDanger(ctx: TCTX, entity: IRenderEntity) {
        if (!settings._entityDanger) return;

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
            const animal = PlayerManager.animalData.get(entity.sid)!;
            const color = animal.isDanger ? "red" : "green";
            Renderer.fillCircle(ctx, entity.x, entity.y, animal.attackRange, color, 0.3);
        }
    }

    render(ctx: TCTX, entity: IRenderEntity, player: IRenderEntity) {
        const now = Date.now();
        this.step = now - this.start;
        this.start = now;
        
        const { myPlayer, EnemyManager, ModuleHandler } = client;
        const isMyPlayer = entity === player;
        if (isMyPlayer) {
            const pos = new Vector(player.x, player.y);
            if (settings._displayPlayerAngle) {
                Renderer.line(ctx, pos, pos.addDirection(client.myPlayer.angle, 70), "#e9adf0");
                // const spikeSyncAngles = ModuleHandler.staticModules.spikeSync.possibleAngles;
                // for (let i=0;i<spikeSyncAngles.length;i++) {
                //     const angle = spikeSyncAngles[i]!;
                //     Renderer.line(ctx, pos, pos.direction(angle, 100), i === 0 ? "#d13330" : "#307ed1", 1, 3);
                // }
                // const angle = EnemyManager.nearestSpikePlacerAngle;
                // if (angle !== null) {
                //     Renderer.line(ctx, pos, pos.direction(angle, 100), "red", 1, 3);
                // }
            }

            this.drawWeaponHitbox(ctx, player);
            this.drawPlacement(ctx);

            // const secondary = myPlayer.weapon.current;
            // const enemy = EnemyManager.nearestEnemy;
            // if (settings._projectileHitbox && DataHandler.isShootable(secondary) && enemy) {
            //     Renderer.circle(ctx, entity.x, entity.y, 700, "#3e2773", 1, 1);
            // }

            if (myPlayer.isTrapped) {
                Renderer.fillCircle(ctx, pos.x, pos.y, 35, "yellow", 0.5);
            }

            // const pathFinder = ModuleHandler.staticModules.pathFinder;
            // const path = pathFinder.path;
            // if (path.length !== 0) {
            //     let start = myPlayer.pos.current.copy();
            //     for (const [x, y] of path) {
            //         Renderer.line(ctx, start, new Vector(x, y), "red", 1, 1);
            //         start.setXY(x, y);
            //     }
            // }
        }

        this.drawEntityHP(ctx, entity);
        if (settings._collisionHitbox) {
            Renderer.circle(ctx, entity.x, entity.y, entity.scale, "#c7fff2", 1, 1);
        }

        if (!isMyPlayer) {
            this.drawHitScale(ctx, entity);
            Renderer.renderTracer(ctx, entity, player);
            Renderer.renderDistance(ctx, entity, player);
            // const nearestTrappedEnemy = EnemyManager.nearestTrappedEnemy;
            // if (entity.isPlayer && nearestTrappedEnemy !== null && entity.sid === nearestTrappedEnemy.id) {
            //     Renderer.fillCircle(ctx, entity.x, entity.y, 35, "#51b054", 0.3);
            // } else {
            // }
            const nearestEnemyToNearestEnemy = EnemyManager.nearestEnemyToNearestEnemy;
            if (nearestEnemyToNearestEnemy !== null && !entity.isAI && entity.sid === nearestEnemyToNearestEnemy.id) {
                Renderer.fillCircle(ctx, entity.x, entity.y, 35, "#48f072", 0.5);
            } else {
                this.drawDanger(ctx, entity);
            }

            // RENDER SPIKE TICK ENTITY
            const spikeCollider = EnemyManager.enemySpikeCollider;
            if (
                spikeCollider &&
                !entity.isAI &&
                entity.sid === spikeCollider.id
            ) {
                Renderer.fillCircle(ctx, entity.x, entity.y, 10, "#691313");
            }
        }

        if (isMyPlayer) {
            NotificationRenderer.render(ctx, player);
        }
    }
}

export default EntityRenderer;