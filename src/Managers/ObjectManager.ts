import { reverseAngle } from './../utility/Common';
import { Items } from "../constants/Items";
import { PlayerObject, Resource, type TObject } from "../data/ObjectItem";
import Player from "../data/Player";
import Vector from "../modules/Vector";
import { EItem, EWeapon, ItemGroup, ItemType, type TPlaceable } from "../types/Items";
import { findMiddleAngle, findPlacementAngles, getAngleDist, pointInRiver, targetInsideRect } from "../utility/Common";
import type { IAngle } from "../types/Common";
import PlayerClient from "../PlayerClient";
import settings from "../utility/Settings";
import NotificationRenderer from "../rendering/NotificationRenderer";
import SpatialHashGrid2D from "../modules/SpatialHashGrid2D";
import Sorting from "../utility/Sorting";
import DataHandler from "../utility/DataHandler";
import type Animal from "../data/Animal";
import { CollideType } from '../data/Entity';

export interface INode {
    readonly angleTo: number;
    readonly distanceTo: number;
    readonly offset: number;
    readonly startPos: Vector;
}

export interface IPlaceOptions {
    readonly position: Vector,
    readonly id: TPlaceable,
    readonly targetAngle: number,

    /** True, if output angles should be reduces to a specific size */
    reduce: boolean,

    /** ID of object which should be excluded from checking */
    ignoreID: number | null;

    /** true, if object's health should be included when checking */
    preplace: boolean;

    /** true, if rest of space should be filled with the same angles */
    fill: boolean;
}

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

            const { PlayerManager, myPlayer } = this.client;
            const owner = (
                PlayerManager.playerData.get(object.ownerID) ||
                PlayerManager.createPlayer({ id: object.ownerID })
            );
            object.seenPlacement = this.inPlacementRange(object);
            owner.handleObjectPlacement(object);

            if (object.type === EItem.TELEPORTER) {
                if (myPlayer.collidingObject(object, CollideType.CURRENT) || myPlayer.collidingObject(object, CollideType.PREV)) {
                    myPlayer.teleportPos.setVec(object.pos.current);
                    myPlayer.teleported = true;
                }
            }
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

    readonly deletedObjects = new Set<PlayerObject>();

    isDestroyedObject() {
        return this.deletedObjects.size !== 0;
    }

    private removeObject(object: TObject) {
        this.grid2D.remove(object.pos.current.x, object.pos.current.y, object.collisionScale, object.id);
        this.objects.delete(object.id);

        if (object instanceof PlayerObject) {
            const player = this.client.PlayerManager.playerData.get(object.ownerID);
            if (player !== undefined) {
                player.handleObjectDeletion(object);
                
                const { myPlayer } = this.client;
                const pos1 = object.pos.current.copy();
                const pos2 = this.client.myPlayer.pos.current.copy();
                const distance = pos1.distance(pos2);

                const spikeID = myPlayer.getItemByType(ItemType.SPIKE);
                const range = myPlayer.getItemPlaceScale(spikeID) + object.placementScale + myPlayer.speed + 25;
                if (distance <= range) {
                    this.deletedObjects.add(object);
                }
            }
        }
    }

    removeObjectByID(id: number) {
        const object = this.objects.get(id);
        if (object !== undefined) {
            this.removeObject(object);

            if (this.client.isOwner) {
                const pos1 = object.pos.current.copy();
                const pos2 = this.client.myPlayer.pos.current.copy();
                if (settings._notificationTracers && !targetInsideRect(pos1, pos2, object.scale)) {
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

    isTurretReloaded(object: TObject, tick = 1): boolean {
        const turret = this.reloadingTurrets.get(object.id);
        if (turret === undefined) return true;

        return turret.reload > turret.maxReload - tick;
    }

    /** Called after all packet received */
    postTick() {
        for (const [id, turret] of this.reloadingTurrets) {
            turret.reload += 1;
            if (turret.reload >= turret.maxReload) {
                turret.reload = turret.maxReload;
                this.reloadingTurrets.delete(id);
            }
        }
    }

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

    getBestPlacementAngles(options: IPlaceOptions): number[] {
        const {
            position,
            id,
            targetAngle,
            ignoreID,
            reduce,
            preplace,
            fill,
        } = options;
        const item = DataHandler.getItem(id);

        const { myPlayer, ModuleHandler } = this.client;
        const length = myPlayer.getItemPlaceScale(id);

        const angles: IAngle[] = [];
        // const preplaceAngles: IAngle[] = [];
        this.grid2D.query(position.x, position.y, 1, (id: number) => {
            const object = this.objects.get(id)!;
            if (
                ignoreID !== null && ignoreID === object.id 
            ) return;

            const pos1 = object.pos.current;
            const angle = position.angle(pos1);

            const a = object.placementScale + item.scale + 1;
            const b = position.distance(pos1);
            const c = length;
            const cosArg = (b * b + c * c - a * a) / (2 * b * c);

            // let offset: number;
            // if (cosArg < -1) {
            //     offset = Math.PI;
            // } else if (cosArg <= 1) {
            //     offset = Math.acos(cosArg);
            // } else {
            //     return;
            // }

            // if (preplace && object instanceof PlayerObject && object.canBeDestroyed) {
            //     preplaceAngles.push([ angle, offset ]);
            // } else {
            //     angles.push([ angle, offset ]);
            // }
            if (cosArg < -1) {
                angles.push([ angle, Math.PI ]);
            } else if (cosArg <= 1) {
                const offset = Math.acos(cosArg);
                angles.push([ angle, offset ]);
            }
        });

        // const finalAngles = findPlacementAngles(angles);
        const finalAngles = findPlacementAngles(angles);
        // if (preplace && preplaceAngles.length > 0) {
        //     const preplaceFinalAngles = findPlacementAngles([...angles, ...preplaceAngles]);
        //     finalAngles = [...new Set([...finalAngles, ...preplaceFinalAngles])];
        // }

        // Checks if it is actually possible to use targetAngle in order to place an object
        const targetAngleOverlaps = angles.some(([ angle, offset ]) => getAngleDist(targetAngle, angle) <= offset);
        if (!targetAngleOverlaps) {
            finalAngles.push(targetAngle);

            if (finalAngles.length === 1 && fill) {
                if (item.itemType === ItemType.SPIKE) return [];
                const offset = Math.asin((2 * item.scale + 1) / (2 * length)) * 2;
                finalAngles.push(targetAngle - offset);
                finalAngles.push(targetAngle + offset);
                finalAngles.push(reverseAngle(targetAngle));
                return finalAngles.slice(0, settings._placeAttempts);
            }
        }

        let anglesSorted = finalAngles.sort(Sorting.byAngleDistance(targetAngle));
        if (reduce) {
            if (!DataHandler.canMoveOnTop(id) && ModuleHandler.move_dir !== null && myPlayer.speed !== 0) {
                const scale = item.scale;
                const offset = Math.asin((2 * scale) / (2 * length));
                anglesSorted = anglesSorted.filter(angle => {
                    return getAngleDist(angle, ModuleHandler.move_dir!) > offset; 
                });
            }
            return anglesSorted.slice(0, settings._placeAttempts);
        }
        return anglesSorted;
    }
}

export default ObjectManager;