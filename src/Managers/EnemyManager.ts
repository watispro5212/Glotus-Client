import { PlayerObject, type TObject } from "../data/ObjectItem";
import Player from "../data/Player";
import { EDanger } from "../types/Enums";
import { EItem, EWeapon, ItemGroup } from "../types/Items";
import PlayerClient from "../PlayerClient";
import Animal from "../data/Animal";
import { getAngleDist } from "../utility/Common";
import { Items } from "../constants/Items";
import GameUI from "../UI/GameUI";
import DataHandler from "../utility/DataHandler";
import { CollideType } from "../data/Entity";

const enum ENearest {
    PLAYER,
    ANIMAL
}

type TEntity = Player | Animal;
type TTarget = TEntity | TObject;

class EnemyManager {
    private readonly client: PlayerClient;

    // private readonly enemiesGrid = new SpatialHashGrid<Player>(100);
    // readonly enemies: Player[] = [];
    readonly trappedEnemies = new Set<Player>();
    private readonly dangerousEnemies: Player[] = [];
    private readonly _nearestEnemy: [Player | null, Animal | null] = [null, null];

    /** The closest enemy that can attack myPlayer using melee weapons */
    // nearestMeleeReloaded: Player | null = null;

    /** The closest animal that can cause damage to myPlayer */
    nearestDangerAnimal: Animal | null = null;

    /** The closest enemy trap to myPlayer */
    nearestTrap: PlayerObject | null = null;

    /** Represents nearest object collider to myPlayer. Can be spike, cactus, teleport or boostpad */
    nearestCollider: TObject | null = null;

    /** The closest enemy that can be pushed into spike */
    nearestEnemySpikeCollider: Player | null = null;

    /** Represents spinning spike that enemy can be pushed on based on angle distance */
    spikeCollider: PlayerObject | null = null;

    /** Represents nearest enemy that is collding or going to be colliding a spike */
    enemySpikeCollider: Player | null = null;

    nearestTurretEntity: TEntity | null = null;

    /** Represents some danger enemy within a specific range */
    detectedEnemy = false;

    nearestTrappedEnemy: Player | null = null;
    previousTrappedEnemy: Player | null = null;

    /** Represents nearest destructable player object. Used to detect whether we should equip tank or not */
    nearestPlayerObject: PlayerObject | null = null;

    /** Represents nearest destructable enemy object. Used for autodestruction */
    nearestEnemyObject: PlayerObject | null = null;
    secondNearestEnemyObject: PlayerObject | null = null;
    nearestSpike: PlayerObject | null = null;

    willCollideSpike = false;

    /** Represents an angle to nearest enemy, on whom a spinning spike can be placed */
    nearestSpikePlacerAngle: number[] | null = null;
    private prevNearestSpikePlacerAngle: number[] | null = null;

    /** Represents nearest enemy to the nearest enemy */
    nearestEnemyToNearestEnemy: Player | null = null;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    private reset() {
        this.nearestEnemyToNearestEnemy = null;
        this.willCollideSpike = false;
        this.prevNearestSpikePlacerAngle = this.nearestSpikePlacerAngle;
        this.nearestSpikePlacerAngle = null;
        // this.enemiesGrid.clear();
        // this.enemies.length = 0;
        this.trappedEnemies.clear();
        this.dangerousEnemies.length = 0;
        this._nearestEnemy[ENearest.PLAYER] = null;
        this._nearestEnemy[ENearest.ANIMAL] = null;
        // this.nearestMeleeReloaded = null;
        this.nearestDangerAnimal = null;
        this.nearestTrap = null;
        this.nearestCollider = null;
        this.nearestEnemySpikeCollider = null;
        this.spikeCollider = null;
        this.enemySpikeCollider = null;
        this.nearestTurretEntity = null;
        this.detectedEnemy = false;

        this.previousTrappedEnemy = this.nearestTrappedEnemy;
        this.nearestTrappedEnemy = null;
        this.nearestPlayerObject = null;
        this.nearestEnemyObject = null;
        this.secondNearestEnemyObject = null;
        this.nearestSpike = null;
    }

    /** Represents previously trapped enemy, but on the current tick he is not trapped */
    get wasTrappedEnemy() {
        const enemy = this.previousTrappedEnemy;
        if (enemy !== null && this.nearestTrappedEnemy === null) return enemy;
        return null;
    }

    /** Returns a spinning spike placement angle if it wasn't possible to place on previous tick */
    get nearestPlaceSpikeAngle() {
        const prevAngle = this.prevNearestSpikePlacerAngle;
        const currAngle = this.nearestSpikePlacerAngle;
        if (prevAngle === null && currAngle !== null) return currAngle;
        return null;
    }

    get nearestEnemy() {
        return this._nearestEnemy[ENearest.PLAYER];
    }

    get nearestAnimal() {
        return this._nearestEnemy[ENearest.ANIMAL];
    }

    /** Returns true if first entity is closer than the second */
    private isNear(enemy: TEntity, nearest: TEntity | null): boolean;
    private isNear(enemy: TObject, nearest: TObject | null): boolean;
    private isNear(enemy: TTarget, nearest: TTarget | null, owner = this.client.myPlayer): boolean {
        if (nearest === null || enemy === nearest) return true;

        const a0 = owner.pos.current;
        const distance1 = a0.distance(enemy.pos.current);
        const distance2 = a0.distance(nearest.pos.current);
        return distance1 < distance2;
    }

    /** Returns the most nearest entity to myPlayer */
    get nearestEntity() {
        const target1 = this.nearestEnemy;
        const target2 = this.nearestAnimal;
        if (target1 === null) return target2;

        return this.isNear(target1, target2) ? target1 : target2;
    }

    /** Returns true if nearestEnemy is within the specified range */
    nearestEnemyInRangeOf(range: number, target?: Player | Animal | null) {
        const enemy = target || this.nearestEnemy;
        return (
            enemy !== null &&
            this.client.myPlayer.collidingEntity(enemy, range)
        )
    }

    private handleDanger(enemy: Player) {
        if (enemy.dangerList.length >= 2) {
            enemy.dangerList.shift();
        }

        const danger = enemy.canPossiblyInstakill();
        enemy.dangerList.push(danger);
        enemy.danger = Math.max(...enemy.dangerList);

        if (enemy.danger !== EDanger.NONE) {
            this.dangerousEnemies.push(enemy);
            if (enemy.danger >= EDanger.HIGH) {
                this.client.ModuleHandler.needToHeal = true;
            }
            this.detectedEnemy = true;
        }
    }

    /** Checks if the target is standing on a particular object */
    private checkCollision(target: Player, isOwner = false) {
        target.isTrapped = false;
        target.trappedInPrev = target.trappedIn;
        target.trappedIn = null;
        target.onPlatform = false;
        target.onBoostPad = false;

        const { ObjectManager, PlayerManager, myPlayer, ModuleHandler } = this.client;
        const pos1 = myPlayer.pos.current;
        const pos2 = target.pos.current;
        const distanceToTarget = pos1.distance(pos2);

        const maxKB = myPlayer.getMaxKnockback() + target.hitScale + 20;
        // if (distanceToTarget > maxKB) return;

        ObjectManager.grid2D.query(target.pos.current.x, target.pos.current.y, 2, (id: number) => {
            const object = ObjectManager.objects.get(id)!;

            const pos3 = object.pos.current;
            // const distance = pos2.distance(pos3);
            // const range = object.collisionScale + target.collisionScale;
            // if (!isOwner && distance > range + 220) return;

            const isPlayerObject = object instanceof PlayerObject;
            const isCactus = !isPlayerObject && object.isCactus;
            const isSpike = isPlayerObject && object.itemGroup === ItemGroup.SPIKE;
            const isEnemyObject = !isPlayerObject || PlayerManager.isEnemyByID(object.ownerID, target);
            const collidingObject = target.collidingObject(object, 5);

            
            if (isPlayerObject && !isEnemyObject) {
                object.wasTeammate = true;
            }
            
            // HANDLE BEING IN A TRAP
            if (
                isPlayerObject &&
                isEnemyObject &&
                object.type === EItem.PIT_TRAP
            ) {
                if (collidingObject) {
                    if (!isOwner) this.trappedEnemies.add(target);
                    target.isTrapped = true;
                    if (this.isNear(object, target.trappedIn)) {
                        target.trappedIn = object;
                    }
                    if (isOwner && this.isNear(object, this.nearestTrap)) {
                        this.nearestTrap = object;
                    }
                }

                if (target.collidingObject(object, 0, CollideType.CURRENT) || !object.seenPlacement && !object.wasTeammate) {
                    object.trapActivated = true;
                }
            }
            
            if (isPlayerObject && object.isDestroyable) {
                if (object.destroyingTick !== ModuleHandler.tickCount) {
                    object.canBeDestroyed = false;
                    object.tempHealth = object.health;
                }

                const damage = target.getMaxBuildingDamage(object);
                const canSee = (
                    !isEnemyObject ||
                    object.type !== EItem.PIT_TRAP ||
                    isEnemyObject && object.type === EItem.PIT_TRAP && object.trapActivated
                );

                if (damage !== null && canSee) {
                    object.destroyingTick = ModuleHandler.tickCount;
                    object.tempHealth -= damage;
                    if (object.tempHealth <= 0) {
                        object.canBeDestroyed = true;
                    }
                }
            }

            if (isOwner) {
                
                // DETECT NEAREST ENEMY OBJECT THAT IS DESTRUCTABLE
                if (
                    isEnemyObject &&
                    isPlayerObject &&
                    object.isDestroyable
                ) {
                    if (this.isNear(object, this.nearestEnemyObject)) {
                        this.secondNearestEnemyObject = this.nearestEnemyObject;
                        this.nearestEnemyObject = object;
                    }
                    
                    if (
                        object !== this.nearestEnemyObject &&
                        this.isNear(object, this.secondNearestEnemyObject)
                    ) {
                        this.secondNearestEnemyObject = object;
                    }

                    if (
                        object.itemGroup === ItemGroup.SPIKE &&
                        this.isNear(object, this.nearestSpike)
                    ) {
                        this.nearestSpike = object;
                    }
                }

                // DETECT NEAREST PLAYER OBJECT
                if (
                    isPlayerObject &&
                    object.isDestroyable &&
                    this.isNear(object, this.nearestPlayerObject)
                ) {
                    this.nearestPlayerObject = object;
                }

                // DETECT SPIKE/CACTUS COLLISION
                if (
                    !this.willCollideSpike &&
                    isEnemyObject &&
                    (isSpike || isCactus) &&
                    target.collidingObject(object, 70)
                ) {
                    this.willCollideSpike = true;
                }

                // DETECT COLLISION BETWEEN PLAYER AND UNWANTED OBJECTS
                const isAdditional = isPlayerObject && (object.type === EItem.TELEPORTER || object.type === EItem.BOOST_PAD);
                if (
                    isEnemyObject &&
                    (isSpike || isCactus || isAdditional) &&
                    target.collidingObject(object, 200) &&
                    this.isNear(object, this.nearestCollider)
                ) {
                    this.nearestCollider = object;
                }
            } else {
                if (
                    isEnemyObject &&
                    (isSpike || isCactus) &&
                    target.collidingObject(object) &&
                    this.isNear(target, this.enemySpikeCollider)
                ) {
                    this.enemySpikeCollider = target;
                }

                // MAKE SURE WE APPLY LOGIC ONLY TO THE NEAREST ENEMY AND WITHIN MAX KNOCKBACK RANGE
                if (
                    isPlayerObject &&
                    object.type === EItem.SPINNING_SPIKES &&
                    this.isNear(target, this.nearestEnemySpikeCollider) &&
                    target.collidingObject(object, maxKB)
                ) {

                    // CHECK IF IT IS POSSIBLE TO PUSH ENEMY ON SPIKE
                    const spike = DataHandler.getItem(EItem.SPINNING_SPIKES);
                    const angleToEnemy = pos1.angle(pos2);
                    const angleToSpike = pos1.angle(pos3);

                    const distanceToSpike1 = pos1.distance(pos3);
                    const offset = Math.asin((2 * spike.scale) / (2 * distanceToSpike1));
                    const angleDistance = getAngleDist(angleToEnemy, angleToSpike);
                    const intersecting = angleDistance <= offset;
                    if (!intersecting || distanceToTarget > distanceToSpike1) return;

                    if (this.spikeCollider === null) {
                        this.nearestEnemySpikeCollider = target;
                        this.spikeCollider = object;
                    } else {

                        // TEST IF NEW SPIKE HAS LESS DISTANCE BETWEEN STRAIGHT ANGLE THAN PREVIOUS
                        const pos4 = this.spikeCollider.pos.current;

                        const angle1 = pos2.angle(pos3);
                        const angle2 = pos1.angle(pos3);
                        const angle3 = pos2.angle(pos4);
                        const angle4 = pos1.angle(pos4);

                        const angleDist1 = getAngleDist(angle1, angle2);
                        const angleDist2 = getAngleDist(angle3, angle4);
                        if (angleDist1 < angleDist2) {
                            this.nearestEnemySpikeCollider = target;
                            this.spikeCollider = object;
                        }
                    }
                }
            }
        });
    }

    private handleNearest<T extends ENearest>(type: T, enemy: [Player, Animal][T]) {
        if (this.isNear(enemy, this._nearestEnemy[type])) {
            this._nearestEnemy[type] = enemy;

            if (enemy.canUseTurret && this.client.myPlayer.collidingSimple(enemy, 700)) {
                this.nearestTurretEntity = enemy;
            }
        }
    }

    private handleNearestDangerAnimal(animal: Animal) {
        const { myPlayer } = this.client;

        if (!animal.isDanger) return;
        if (!myPlayer.collidingEntity(animal, animal.collisionRange)) return;
        if (!this.isNear(animal, this.nearestDangerAnimal)) return;

        this.nearestDangerAnimal = animal;
    }

    handleEnemies(players: Player[], animals: Animal[]) {

        // It is important to reset data on each tick
        this.reset();

        const { myPlayer, ObjectManager, PlayerManager, ModuleHandler } = this.client;
        this.checkCollision(myPlayer, true);

        for (let i=0;i<players.length;i++) {
            const player = players[i]!;
            if (myPlayer.isEnemyByID(player.id)) {
                // this.enemiesGrid.insert(player);
                // this.enemies.push(player);

                this.checkCollision(player);
                this.handleDanger(player);
                this.handleNearest(ENearest.PLAYER, player);
                // this.handleNearestMelee(player);
            }
        }

        for (const trappedEnemy of this.trappedEnemies) {
            if (this.isNear(trappedEnemy, this.nearestTrappedEnemy)) {
                this.nearestTrappedEnemy = trappedEnemy;
            }
        }

        const nearest = this.nearestEnemy;
        if (nearest !== null) {
            const pos1 = myPlayer.pos.current;
            const pos2 = nearest.pos.current;
            const angleToEnemy = pos1.angle(pos2);
    
            const spikeID = EItem.SPINNING_SPIKES;
            const placeLength = myPlayer.getItemPlaceScale(spikeID);

            // Checks if it is possible to place spike on nearest enemy
            // Ignores object's health and all objects included while checking
            // This basically simulates ON_OBJECT_REMOVE call
            const angles = ObjectManager.getBestPlacementAngles(pos1, spikeID, angleToEnemy, null, true, false);
            const spikeScale = Items[spikeID].scale;
            const possibleAngles = angles.filter(angle => {
                const spikePos = pos1.addDirection(angle, placeLength);
                const distance = pos2.distance(spikePos);
                const range = nearest.collisionScale + spikeScale;
                return distance <= range;
            });
            if (possibleAngles.length !== 0) {
                this.nearestSpikePlacerAngle = possibleAngles;
            }

            for (let i=0;i<players.length;i++) {
                const player = players[i]!;
                if (myPlayer.isMyPlayerByID(player.id)) continue;
                if (PlayerManager.isEnemyByID(nearest.id, player) && this.isNear(player, this.nearestEnemyToNearestEnemy)) {
                    this.nearestEnemyToNearestEnemy = player;
                }
            }
        }

        for (let i=0;i<animals.length;i++) {
            const animal = animals[i]!;
            this.handleNearest(ENearest.ANIMAL, animal);
            this.handleNearestDangerAnimal(animal);
        }
    }
}

export default EnemyManager;