import PlayerClient from "../PlayerClient";
import Animals from "../constants/Animals";
import Vector from "../modules/Vector";
import { ItemGroup } from "../types/Items";
import { getAngleDist } from "../utility/Common";
import { PlayerObject, Resource, type TObject } from "./ObjectItem";

interface IPos {
    readonly previous: Vector;
    readonly current: Vector;
    readonly future: Vector;
}

export const enum CollideType {
    CURRENT = 0b001,
    FUTURE = 0b010,
    PREV = 0b100,
    CURRENT_FUTURE = 0b011,
    ALL = 0b111,
}

/**
 * Abstract entity class. Represents players and animals
 */
abstract class Entity {
    id = -1;

    readonly pos: IPos = {
        previous: new Vector,
        current: new Vector,
        future: new Vector
    }

    angle = 0;
    scale: (typeof Animals[number])["scale"] | 35 | 0 = 0;
    speed = 0;
    move_dir = 0;

    protected setFuturePosition() {
        const { previous, current, future } = this.pos;
        const distance = previous.distance(current);
        this.speed = distance;
        const angle = previous.angle(current);
        this.move_dir = angle;
        future.setVec(current.addDirection(angle, distance));
    }

    get collisionScale() {
        return this.scale;
    }

    get hitScale() {
        return this.scale * 1.8;
    }

    protected readonly client: PlayerClient;
    constructor(client: PlayerClient) {
        this.client = client;
    }

    getFuturePosition(speed: number) {
        const pos = this.pos.current.copy();
        return pos.add(Vector.fromAngle(this.move_dir, speed));
    }
    
    colliding(object: TObject, radius: number) {
        const { previous: a0, current: a1, future: a2 } = this.pos;
        const b0 = object.pos.current;
        return (
            a0.distance(b0) <= radius ||
            a1.distance(b0) <= radius ||
            a2.distance(b0) <= radius
        )
    }

    collidingObject(object: TObject, addRadius = 0, checkType = CollideType.CURRENT_FUTURE): boolean {
        const { previous: a0, current: a1, future: a2 } = this.pos;
        const b0 = object.pos.current;
        const radius = this.collisionScale + object.collisionScale + addRadius;
        return (
            !!(checkType & 0b100) && a0.distance(b0) <= radius ||
            !!(checkType & 0b010) && a1.distance(b0) <= radius ||
            !!(checkType & 0b001) && a2.distance(b0) <= radius
        )
    }
    
    /** checks if entities collide with each other using their current position and given range */
    collidingSimple(entity: Entity | PlayerObject, range: number, tempPos = this.pos.current) {
        const pos1 = tempPos;
        const pos2 = entity.pos.current;
        return pos1.distance(pos2) <= range;
    }

    collidingEntity(entity: Entity, range: number, checkBased = false, prev = true) {
        const { previous: a0, current: a1, future: a2 } = this.pos;
        const { previous: b0, current: b1, future: b2 } = entity.pos;
        if (checkBased) {
            return (
                prev && a0.distance(b0) <= range ||
                a1.distance(b1) <= range ||
                a2.distance(b2) <= range
            )
        }

        return (
            a0.distance(b0) <= range ||
            a0.distance(b1) <= range ||
            a0.distance(b2) <= range ||
            
            a1.distance(b0) <= range ||
            a1.distance(b1) <= range ||
            a1.distance(b2) <= range ||

            a2.distance(b0) <= range ||
            a2.distance(b1) <= range ||
            a2.distance(b2) <= range
        )
    }

    // checkCollidingObject(object: PlayerObject | Resource, itemGroup: ItemGroup, addRadius = 0, checkEnemy = false, collideType = CollideType.ALL) {
    //     const { ObjectManager } = this.client;
    //     const matchItem = object instanceof PlayerObject && object.itemGroup === itemGroup;
    //     const isCactus = object instanceof Resource && itemGroup === ItemGroup.SPIKE && object.isCactus;

    //     if (matchItem || isCactus) {
    //         if (checkEnemy && !ObjectManager.isEnemyObject(object)) return false;
    //         if (this.collidingObject(object, addRadius, collideType)) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }
    // /**
    //  * true, if entity is colliding an item
    //  * @param itemGroup type of item, that can be placed
    //  * @param addRadius Adds this amount to the item radius
    //  * @param checkEnemy true, if you want to check if colliding enemy object. Works only for myPlayer
    //  */
    // checkCollision(itemGroup: ItemGroup, addRadius = 0, checkEnemy = false, collideType = CollideType.ALL): boolean {
    //     const { ObjectManager } = this.client;
    //     return ObjectManager.grid2D.query(this.pos.current.x, this.pos.current.y, 1, (id: number) => {
    //         const object = ObjectManager.objects.get(id)!;
    //         if (this.checkCollidingObject(object, itemGroup, addRadius, checkEnemy, collideType)) {
    //             return true;
    //         }
    //     })
    // }

    runningAwayFrom(entity: Entity, angle: number | null): boolean {

        // We just stay
        if (angle === null) return false;

        const pos1 = this.pos.current;
        const pos2 = entity.pos.current;
        const angleTo = pos1.angle(pos2);

        // Running towards entity
        if (getAngleDist(angle, angleTo) <= Math.PI / 2) return false;
        return true;
    }
}

export default Entity;