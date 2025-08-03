import { Items } from "../constants/Items";
import { PlayerObject, Resource, type TObject } from "../data/ObjectItem";
import Player from "../data/Player";
import Vector from "../modules/Vector";
import { EItem, EWeapon, type TPlaceable } from "../types/Items";
import { findPlacementAngles, getAngleDist, inView, pointInRiver } from "../utility/Common";
import type { IAngle } from "../types/Common";
import PlayerClient from "../PlayerClient";
import settings from "../utility/Settings";
import NotificationRenderer from "../rendering/NotificationRenderer";
import SpatialHashGrid2D from "../modules/SpatialHashGrid2D";
import Sorting from "../utility/Sorting";
import DataHandler from "../utility/DataHandler";

class ObjectManager {

    /**
     * A Map that stores all game objects
     */
    readonly objects = new Map<number, TObject>();
    // readonly grid2D = new SpatialHashGrid2D(256);
    readonly grid2D = new SpatialHashGrid2D(100);

    /**
     * A Map which stores all turret objects that are currently reloading
     */
    readonly reloadingTurrets = new Map<number, PlayerObject>();

    /**
     * A Map of attacked objects at current tick
     */
    readonly attackedObjects = new Map<number, [number, TObject]>();

    private readonly client: PlayerClient;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    private insertObject(object: TObject) {
        this.grid2D.insert(object.pos.current.x, object.pos.current.y, object.collisionScale, object.id);
        this.objects.set(object.id, object);

        if (object instanceof PlayerObject) {

            const { PlayerManager } = this.client;
            const owner = (
                PlayerManager.playerData.get(object.ownerID) ||
                PlayerManager.createPlayer({ id: object.ownerID })
            );
            object.seenPlacement = this.inPlacementRange(object);
            owner.handleObjectPlacement(object);
        }
    }

    /**
     * Called when received add objects packet
     */
    createObjects(buffer: any[]) {
        for (let i=0;i<buffer.length;i+=8) {
            const isResource = buffer[i + 6] === null;
            const data = [buffer[i + 0], buffer[i + 1], buffer[i + 2], buffer[i + 3], buffer[i + 4]] as const;

            this.insertObject(
                isResource ?
                    new Resource(...data, buffer[i + 5]) :
                    new PlayerObject(...data, buffer[i + 6], buffer[i + 7])
            )
        }
    }

    private removeObject(object: TObject) {
        this.grid2D.remove(object.pos.current.x, object.pos.current.y, object.collisionScale, object.id);
        this.objects.delete(object.id);

        if (object instanceof PlayerObject) {
            const player = this.client.PlayerManager.playerData.get(object.ownerID);
            if (player !== undefined) {
                player.handleObjectDeletion(object);
            }
        }
    }

    removeObjectByID(id: number) {
        const object = this.objects.get(id);
        if (object !== undefined) {
            this.removeObject(object);

            if (this.client.isOwner) {
                const pos = object.pos.current.copy().sub(this.client.myPlayer.offset);
                if (settings._notificationTracers && !inView(pos.x, pos.y, object.scale)) {
                    NotificationRenderer.add(object);
                }
            }
        }
    }

    removePlayerObjects(player: Player) {
        for (const object of player.objects) {
            this.removeObject(object);
        }
    }

    resetTurret(id: number) {
        const object = this.objects.get(id);
        if (object instanceof PlayerObject) {
            object.reload = 0;
            this.reloadingTurrets.set(id, object);
        }
    }

    /** Returns true, if object was placed by an enemy */
    isEnemyObject(object: TObject): boolean {
        if (object instanceof PlayerObject && !this.client.myPlayer.isEnemyByID(object.ownerID)) {
            return false;
        }
        return true;
    }

    isTurretReloaded(object: TObject): boolean {
        const turret = this.reloadingTurrets.get(object.id);
        if (turret === undefined) return true;

        const tick = this.client.SocketManager.TICK;
        return turret.reload > turret.maxReload - tick;
    }

    /**
     * Called after all packet received
     */
    postTick() {
        for (const [id, turret] of this.reloadingTurrets) {
            turret.reload += this.client.PlayerManager.step;
            if (turret.reload >= turret.maxReload) {
                turret.reload = turret.maxReload;
                this.reloadingTurrets.delete(id);
            }
        }
    }

    // retrieveObjects(pos: Vector, size = 2): number[] {
    //     return this.grid2D.query(pos.x, pos.y, size);
    // }

    canPlaceItem(id: TPlaceable, position: Vector, addRadius = 0) {
        if (id !== EItem.PLATFORM && pointInRiver(position)) {
            return false;
        }

        const item = Items[id];
        return !this.grid2D.query(position.x, position.y, 1, (id: number) => {
            const object = this.objects.get(id)!;
            const scale = item.scale + object.placementScale + addRadius;
            if (position.distance(object.pos.current) < scale) {
                return true;
            }
        });
    }

    inPlacementRange(object: PlayerObject): boolean {
        const owner = this.client.PlayerManager.playerData.get(object.ownerID);
        if (owner === undefined || !this.client.PlayerManager.players.includes(owner)) return false;

        const { previous: a0, current: a1, future: a2 } = owner.pos;
        const b0 = object.pos.current;
        const item = Items[object.type];
        const range = owner.scale * 2 + item.scale + item.placeOffset;
        return (
            a0.distance(b0) <= range ||
            a1.distance(b0) <= range ||
            a2.distance(b0) <= range
        )
    }

    getBestPlacementAngles(
        position: Vector,
        id: TPlaceable,
        targetAngle: number | null = null,
        ignoreID: number | null = null,
        ignoreHealth = false,
        reduce = true
    ): number[] {
        const item = Items[id];
        const length = this.client.myPlayer.getItemPlaceScale(id);

        // const hammerDamage = 75 * 1.18 * 3.3;
        const angles: IAngle[] = [];
        this.grid2D.query(position.x, position.y, 1, (id: number) => {
            const object = this.objects.get(id)!;
            if (
                !ignoreHealth && object instanceof PlayerObject && object.canBeDestroyed /* && object.health <= hammerDamage */ ||
                ignoreID !== null && ignoreID === object.id 
            ) return;

            const pos1 = object.pos.current;
            const angle = position.angle(pos1);
            const distance = position.distance(pos1);

            const a = object.placementScale + item.scale + 3;
            const b = distance;
            const c = length;
            const cosArg = (b * b + c * c - a * a) / (2 * b * c);

            // TODO: fix when myPlayer is slightly out of trap and it shows impossible straight angle
            if (cosArg < -1) {
                angles.push({ angle, offset: Math.PI });
            } else if (cosArg <= 1) {
                const offset = Math.acos(cosArg);
                angles.push({ angle, offset });
            }
        });
        const finalAngles = findPlacementAngles(angles).slice(0, reduce ? 3 : angles.length);
        if (targetAngle === null) return finalAngles;

        // Checks if it is actually possible to use targetAngle in order to place an object
        const targetAngleOverlaps = angles.some(({ angle, offset }) => getAngleDist(targetAngle, angle) <= offset);
        if (!targetAngleOverlaps) {
            finalAngles.push(targetAngle);
        }

        return finalAngles.sort(Sorting.byAngleDistance(targetAngle));
    }
}

export default ObjectManager;