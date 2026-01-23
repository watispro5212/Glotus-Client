import { ItemGroups, Items } from "../constants/Items";
import Vector from "../modules/Vector";
import { EResourceType } from "../types/Enums";
import { EItem, ItemGroup, type TPlaceable } from "../types/Items";
import { pointInDesert } from "../utility/Common";
import DataHandler from "../utility/DataHandler";
import type Projectile from "./Projectile";

/**
 * Represents resources and player objects
 */
abstract class ObjectItem {
    readonly id: number;
    readonly pos: {
        readonly current: Vector;
    }
    readonly angle: number;
    readonly scale: number = 0;

    constructor(
        id: number,
        x: number,
        y: number,
        angle: number,
        scale: number,
    ) {
        this.id = id;
        this.pos = {
            current: new Vector(x, y),
        };
        this.angle = angle;
        this.scale = scale;
    }

    get hitScale() {
        return this.scale;
    }
}

export class Resource extends ObjectItem {
    readonly type: EResourceType;
    readonly layer: number;
    constructor(
        id: number,
        x: number,
        y: number,
        angle: number,
        scale: number,
        type: EResourceType
    ) {
        super(id, x, y, angle, scale);
        this.type = type;
        this.layer = type === 0 ? 3 : type === 2 ? 0 : 2;
    }

    formatScale(scaleMult = 1) {
        const reduceScale = this.type === 0 || this.type === 1 ? 0.6 * scaleMult : 1;
        return this.scale * reduceScale;
    }

    get collisionScale() {
        return this.formatScale();
    }

    get placementScale() {
        return this.formatScale(0.6);
    }

    get isCactus() {
        return this.type === EResourceType.FOOD && pointInDesert(this.pos.current);
    }

    getDamage() {
        if (this.isCactus) return 35;
        return 0;
    }
}

export class PlayerObject extends ObjectItem {
    readonly type: TPlaceable;

    /**
     * ID of player who placed this item
     */
    readonly ownerID: number;
    readonly collisionDivider: number;

    /**
     * current health of item
     */
    health: number;
    tempHealth: number;
    readonly maxHealth: number;
    reload: number = -1;
    readonly maxReload: number = -1;
    readonly isDestroyable: boolean;

    destroyingTick = 0;
    /** true, if object can be destroyed by any player on the next tick */
    canBeDestroyed = false;
    trapActivated = false;
    wasTeammate = false;

    /**
     * true, if my player saw how this item was placed
     */
    seenPlacement = false;
    readonly layer: number;
    readonly itemGroup: ItemGroup;
    projectile: Projectile | null = null;

    constructor(
        id: number,
        x: number,
        y: number,
        angle: number,
        scale: number,
        type: TPlaceable,
        ownerID: number
    ) {
        super(id, x, y, angle, scale);
        this.type = type;
        this.ownerID = ownerID;
        
        const item = Items[type];
        this.collisionDivider = "colDiv" in item ? item.colDiv : 1;
        this.health = "health" in item ? item.health : Infinity;
        this.tempHealth = this.health;
        this.maxHealth = this.health;
        this.isDestroyable = this.maxHealth !== Infinity;

        if (item.id === EItem.TURRET) {
            this.reload = Math.ceil(item.shootRate / 111);
            this.maxReload = this.reload;
        }
        this.layer = ItemGroups[item.itemGroup].layer;
        this.itemGroup = item.itemGroup;
    }

    formatScale(placeCollision = false): number {
        return this.scale * (placeCollision ? 1 : this.collisionDivider);
    }

    get collisionScale(): number {
        return this.formatScale();
    }

    get placementScale() {
        const item = Items[this.type];
        if (item.id === EItem.BLOCKER) return item.blocker;
        return this.scale;
    }

    get isSpike() {
        return this.itemGroup === ItemGroup.SPIKE;
    }

    getDamage() {
        if (this.isSpike) {
            const type = this.type as (EItem.SPIKES | EItem.GREATER_SPIKES | EItem.POISON_SPIKES | EItem.SPINNING_SPIKES);
            return DataHandler.getItem(type).damage;
        }
        return 0;
    }
}

export type TObject = Resource | PlayerObject;