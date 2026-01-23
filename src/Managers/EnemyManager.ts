import { PlayerObject, type TObject } from "../data/ObjectItem";
import Player from "../data/Player";
import { EDanger } from "../types/Enums";
import { EItem, EWeapon, ItemGroup, ItemType } from "../types/Items";
import PlayerClient from "../PlayerClient";
import Animal from "../data/Animal";
import { getAngleDist } from "../utility/Common";
import { Items } from "../constants/Items";
import GameUI from "../UI/GameUI";
import DataHandler from "../utility/DataHandler";
import { CollideType } from "../data/Entity";
import { EHat } from "../types/Store";
import { Hats } from "../constants/Store";
import settings from "../utility/Settings";

const enum ENearest {
    PLAYER,
    ANIMAL
}

type TEntity = Player | Animal;
type TTarget = TEntity | TObject;

class EnemyManager {
    private readonly client: PlayerClient;

    private readonly dangerousEnemies: Player[] = [];
    private readonly _nearestEnemy: [Player | null, Animal | null] = [null, null];

    /** The closest animal that can cause damage to myPlayer */
    nearestDangerAnimal: Animal | null = null;

    /** The closest enemy trap to myPlayer */
    nearestTrap: PlayerObject | null = null;

    /** Represents nearest object collider to myPlayer. Can be spike, cactus, teleport or boostpad */
    nearestCollider: TObject | null = null;
    secondNearestCollider: TObject | null = null;

    /** The closest enemy that can be pushed into spike */
    nearestEnemySpikeCollider: Player | null = null;

    /** Represents spinning spike that enemy can be pushed on based on angle distance */
    spikeCollider: TObject | null = null;

    /** Represents nearest enemy that is collding or going to be colliding a spike */
    enemySpikeCollider: Player | null = null;

    nearestTurretEntity: TEntity | null = null;

    /** Represents some danger enemy within a specific range */
    detectedEnemy = false;
    dangerWithoutSoldier = false;
    detectedDangerEnemy = false;

    nearestTrappedEnemy: Player | null = null;
    previousTrappedEnemy: Player | null = null;

    /** Represents nearest destructable player object. Used to detect whether we should equip tank or not */
    nearestPlayerObject: PlayerObject | null = null;
    secondNearestPlayerObject: PlayerObject | null = null;
    nearestObject: TObject | null = null;

    /** Represents nearest destructable enemy object. Used for autodestruction */
    nearestEnemyObject: PlayerObject | null = null;
    secondNearestEnemyObject: PlayerObject | null = null;
    nearestSpike: PlayerObject | null = null;

    willCollideSpike = false;
    collidingSpike = false;

    /** Represents an angle to nearest enemy, on whom a spinning spike can be placed */
    nearestSpikePlacerAngle: number[] | null = null;
    private prevNearestSpikePlacerAngle: number[] | null = null;

    /** Represents nearest enemy to the nearest enemy */
    nearestEnemyToNearestEnemy: Player | null = null;
    
    /** Enemy is able to place spike on this current tick */
    enemyCanPlaceSpike = false;
    possibleToKnockback = false;
    potentialSpikeKnockbackDamage = 0;
    potentialSpikeDamage = 0;
    potentialDamage = 0;
    primaryDamage = 0;
    detectedDanger = false;
    reverseInsta = false;
    rangedBowInsta = false;
    spikeSyncThreat = false;
    velocityTickThreat = false;

    nearestLowEntity: TEntity | null = null;

    /** Represents nearestEnemy that is trapped in my or teammates trap */
    nearestEnemyPush: Player | null = null;
    nearestPushSpike: TObject | null = null;

    nearestLowHPObjectPrev: PlayerObject | null = null;
    nearestLowHPObject: PlayerObject | null = null;
    nearestSyncEnemy: Player | null = null;

    constructor(client: PlayerClient) {
        this.client = client;
    }

    preReset() {
        this._nearestEnemy[ENearest.PLAYER] = null;
        this._nearestEnemy[ENearest.ANIMAL] = null;
        this.nearestDangerAnimal = null;
        this.nearestLowEntity = null;
    }

    reset() {
        this.nearestEnemyToNearestEnemy = null;
        this.willCollideSpike = false;
        this.collidingSpike = false;
        this.prevNearestSpikePlacerAngle = this.nearestSpikePlacerAngle;
        this.nearestSpikePlacerAngle = null;
        this.dangerousEnemies.length = 0;
        this.nearestTrap = null;
        this.nearestCollider = null;
        this.nearestEnemySpikeCollider = null;
        this.spikeCollider = null;
        this.enemySpikeCollider = null;
        this.nearestTurretEntity = null;
        this.detectedEnemy = false;
        this.dangerWithoutSoldier = false;
        this.detectedDangerEnemy = false;

        this.previousTrappedEnemy = this.nearestTrappedEnemy;
        this.nearestTrappedEnemy = null;
        this.nearestPlayerObject = null;
        this.nearestObject = null;
        this.secondNearestPlayerObject = null;
        this.nearestEnemyObject = null;
        this.secondNearestEnemyObject = null;
        this.nearestSpike = null;
        this.enemyCanPlaceSpike = false;
        this.possibleToKnockback = false;
        this.velocityTickThreat = false;
        this.potentialSpikeKnockbackDamage = 0;
        this.potentialSpikeDamage = 0;
        this.potentialDamage = 0;
        this.detectedDanger = false;
        this.reverseInsta = false;
        this.rangedBowInsta = false;
        this.spikeSyncThreat = false;
        this.nearestEnemyPush = null;
        this.nearestPushSpike = null;
        this.nearestLowHPObjectPrev = this.nearestLowHPObject;
        this.nearestLowHPObject = null;
        this.nearestSyncEnemy = null;
        this.primaryDamage = 0;
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

    get canSpikeSync() {
        return this.nearestPlaceSpikeAngle !== null && this.client.ObjectManager.isDestroyedObject();
    }

    /** Returns true if first entity is closer than the second */
    isNear(enemy: TEntity, nearest: TEntity | null, owner?: Player): boolean;
    isNear(enemy: TObject, nearest: TObject | null, owner?: Player): boolean;
    isNear(enemy: TTarget, nearest: TTarget | null, owner = this.client.myPlayer): boolean {
        if (nearest === null || enemy === nearest) return true;

        const a0 = owner.pos.current;
        const distance1 = a0.distanceDefault(enemy.pos.current);
        const distance2 = a0.distanceDefault(nearest.pos.current);
        return distance1 < distance2;
    }

    /** Returns the most nearest entity to myPlayer */
    get nearestEntity() {
        const target1 = this.nearestEnemy;
        const target2 = this.nearestAnimal;
        if (target1 === null) return target2;

        return this.isNear(target1, target2) ? target1 : target2;
    }

    instaThreat() {
        return (
            this.velocityTickThreat ||
            this.reverseInsta ||
            this.rangedBowInsta ||
            (this.primaryDamage + this.potentialSpikeKnockbackDamage) >= 100
        )
    }
    
    shouldIgnoreModule() {
        return (
            this.instaThreat() ||
            this.detectedDangerEnemy ||
            this.spikeSyncThreat
        )
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
        // if (enemy.dangerList.length >= 2) {
        //     enemy.dangerList.shift();
        // }

        const danger = enemy.canPossiblyInstakill();
        // enemy.dangerList.push(danger);
        enemy.prevDanger = enemy.danger;
        // enemy.danger = Math.max(...enemy.dangerList);
        enemy.danger = danger;
        if (enemy.canPlaceSpikeObject) {
            this.potentialSpikeDamage = Math.max(this.potentialSpikeDamage, enemy.spikeDamage);
        }
        this.potentialDamage += enemy.potentialDamage;
        this.primaryDamage = Math.max(enemy.primaryDamage, this.primaryDamage);
        if (enemy.prevDanger !== enemy.danger && enemy.danger >= EDanger.MEDIUM) {
            this.detectedDanger = true;
        }

        if (enemy.velocityTicking) {
            this.velocityTickThreat = true;
        }
        if (enemy.reverseInsta) {
            this.reverseInsta = true;
        }
        if (enemy.rangedBowInsta) {
            this.rangedBowInsta = true;
        }
        if (enemy.spikeSyncThreat) {
            this.spikeSyncThreat = true;
        }

        // if (enemy.danger !== EDanger.NONE) {
        //     if (enemy.danger >= EDanger.HIGH) {
        //         this.detectedDangerEnemy = true;
        //     }

        //     this.detectedEnemy = true;
        //     // if (enemy.canPlaceSpikeObject) {
        //     //     this.enemyCanPlaceSpike = true;
        //     // }
        // }
    }

    /** Checks if the target is standing on a particular object */
    private checkCollision(target: Player, isOwner = false) {
        target.isTrapped = false;
        target.trappedInPrev = target.trappedIn;
        target.trappedIn = null;

        const { ObjectManager, PlayerManager, myPlayer, ModuleHandler } = this.client;
        const pos1 = myPlayer.pos.current;
        const pos2 = target.pos.current;
        const distanceToTarget = pos1.distance(pos2);
        const angleToTarget = pos1.angle(pos2);
        // const angleFromTarget = pos2.angle(pos1);

        // const maxKB = myPlayer.getMaxKnockback() + target.hitScale + 20;
        // if (distanceToTarget > maxKB) return;

        ObjectManager.grid2D.query(target.pos.current.x, target.pos.current.y, 3, (id: number) => {
            const object = ObjectManager.objects.get(id)!;
            const pos3 = object.pos.current;
            // const distance = pos2.distance(pos3);
            // const range = object.collisionScale + target.collisionScale;
            // if (!isOwner && distance > range + 220) return;

            const isPlayerObject = object instanceof PlayerObject;
            const isCactus = !isPlayerObject && object.isCactus;
            const isSpike = isPlayerObject && object.itemGroup === ItemGroup.SPIKE;

            const isEnemyObject = !isPlayerObject || PlayerManager.isEnemyByID(object.ownerID, target);
            const isEnemyObjectToMyPlayer = !isPlayerObject || PlayerManager.isEnemyByID(object.ownerID, myPlayer);
            const collidingObject = target.collidingObject(object, 1);
            const collidingCurrent = target.collidingObject(object, 1, CollideType.CURRENT);
            
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
                    if (!isOwner) {
                        if (this.isNear(target, this.nearestTrappedEnemy)) {
                            this.nearestTrappedEnemy = target;
                        }

                        // DETECT IF ENEMY IS TRAPPED IN MY OR TEAMMATES TRAP
                        if (!isEnemyObjectToMyPlayer && this.isNear(target, this.nearestEnemyPush)) {
                            this.nearestEnemyPush = target;
                        }
                    }
                    target.isTrapped = true;
                    if (target.hatID === EHat.TANK_GEAR) {
                        target.usesTank = true;
                    }
                    if (this.isNear(object, target.trappedIn)) {
                        target.trappedIn = object;
                    }
                    if (isOwner && this.isNear(object, this.nearestTrap)) {
                        this.nearestTrap = object;
                    }
                }

                if (collidingCurrent || !object.seenPlacement && !object.wasTeammate) {
                    object.trapActivated = true;
                }
            }

            if (
                isOwner &&
                isPlayerObject &&
                object.type === EItem.TELEPORTER &&
                collidingCurrent
            ) {
                myPlayer.teleportPos.setVec(pos1);
                myPlayer.teleported = true;
            }
            
            // const isMyPlayer = target === myPlayer;
            if (isPlayerObject && object.isDestroyable) {
                if (object.destroyingTick !== ModuleHandler.tickCount) {
                    object.canBeDestroyed = false;
                    object.tempHealth = object.health;
                }

                // const damage = target.getMaxBuildingDamage(object, !isMyPlayer);
                const damage = target.getMaxBuildingDamage(object, true);
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
                    if (object.type === EItem.PIT_TRAP || object.type === EItem.BOOST_PAD || object.itemGroup === ItemGroup.SPIKE) {
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
                    }

                    if (
                        object.itemGroup === ItemGroup.SPIKE &&
                        this.isNear(object, this.nearestSpike)
                    ) {
                        this.nearestSpike = object;
                    }
                }

                if (this.isNear(object, this.nearestObject)) {
                    this.nearestObject = object;
                }

                // DETECT NEAREST PLAYER OBJECT
                if (
                    isPlayerObject &&
                    object.isDestroyable
                ) {
                    if (this.isNear(object, this.nearestPlayerObject)) {
                        this.secondNearestPlayerObject = this.nearestPlayerObject;
                        this.nearestPlayerObject = object;
                    }
                    
                    if (
                        object !== this.nearestPlayerObject &&
                        this.isNear(object, this.secondNearestPlayerObject)
                    ) {
                        this.secondNearestPlayerObject = object;
                    }
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

                // DETECT ACTUAL OR POTENTIAL SPIKE DAMAGE COLLISION
                if (
                    isEnemyObject &&
                    (isSpike || isCactus) &&
                    target.colliding(object, target.collisionScale + object.collisionScale + 1)
                ) {
                    this.collidingSpike = true;
                    this.potentialSpikeDamage = Math.max(this.potentialSpikeDamage, object.getDamage());
                }

                // DETECT COLLISION BETWEEN PLAYER AND UNWANTED OBJECTS
                const isAdditional = isPlayerObject && object.type === EItem.BOOST_PAD;
                if (
                    isEnemyObject &&
                    (isSpike || isCactus || isAdditional) &&
                    target.collidingObject(object, 150)
                ) {
                    if (this.isNear(object, this.nearestCollider)) {
                        this.secondNearestCollider = this.nearestCollider;
                        this.nearestCollider = object;
                    }
                    
                    if (
                        object !== this.nearestCollider &&
                        this.isNear(object, this.secondNearestCollider)
                    ) {
                        this.secondNearestCollider = object;
                    }
                }
            } else {

                const { primary, secondary } = myPlayer.weapon;
                if (
                    isPlayerObject && object.isDestroyable &&
                    secondary === EWeapon.GREAT_HAMMER &&
                    primary !== null && primary !== EWeapon.STICK
                ) {
                    const damage = myPlayer.getBuildingDamage(secondary, true);
                    const primaryRange = DataHandler.getWeapon(primary).range + target.hitScale;
                    const secondaryRange = DataHandler.getWeapon(secondary).range + object.hitScale;

                    if (
                        myPlayer.collidingSimple(target, primaryRange) &&
                        myPlayer.collidingSimple(object, secondaryRange) &&
                        object.health <= damage
                    ) {

                        const itemType = ItemType.SPIKE;
                        const spikeID = myPlayer.getItemByType(itemType);
                        const placeLength = myPlayer.getItemPlaceScale(spikeID);
                        const spikeScale = Items[spikeID].scale;

                        const spikePos = pos1.addDirection(angleToTarget, placeLength);
                        const distance = pos2.distance(spikePos);
                        const range = target.collisionScale + spikeScale;
                        if (distance <= range && this.isNear(object, this.nearestLowHPObject)) {
                            this.nearestLowHPObject = object;
                            this.nearestSyncEnemy = target;
                        }
                    }
                }

                // FIND A SPIKE myPlayer CAN BE PUSHED ON
                if (
                    isEnemyObjectToMyPlayer &&
                    (isSpike || isCactus) &&
                    !myPlayer.isTrapped
                ) {
                    const KBDistance = target.getActualMaxKnockback(myPlayer);
                    const spikeScale = object.collisionScale + myPlayer.collisionScale;
                    const angleToEnemy = pos2.angle(pos1);
                    const angleToSpike = pos2.angle(pos3);

                    const distanceToSpike1 = pos2.distance(pos3);
                    const offset = Math.asin((2 * spikeScale) / (2 * distanceToSpike1));
                    const angleDistance = getAngleDist(angleToEnemy, angleToSpike);
                    const intersecting = angleDistance <= offset;
                    const overlapping = distanceToTarget <= distanceToSpike1;
                    const inRange = KBDistance !== 0 && myPlayer.collidingObject(object, KBDistance);

                    if (intersecting && overlapping && inRange) {
                        this.possibleToKnockback = true;
                        this.potentialSpikeKnockbackDamage = Math.max(this.potentialSpikeKnockbackDamage, object.getDamage());
                    }
                }

                if (
                    isEnemyObject &&
                    (isSpike || isCactus) &&
                    target.collidingObject(object) &&
                    this.isNear(target, this.enemySpikeCollider)
                ) {
                    this.enemySpikeCollider = target;
                }

                // MAKE SURE WE APPLY LOGIC ONLY TO THE NEAREST ENEMY
                if (
                    isEnemyObject &&
                    (isSpike || isCactus) &&
                    this.isNear(target, this.nearestEnemySpikeCollider)
                ) {

                    // CHECK IF IT IS POSSIBLE TO PUSH ENEMY ON SPIKE
                    const KBDistance = myPlayer.getActualMaxKnockback(target);
                    const spikeScale = object.collisionScale + target.collisionScale * 1.5;
                    const angleToEnemy = pos1.angle(pos2);
                    const angleToSpike = pos1.angle(pos3);

                    const distanceToSpike1 = pos1.distance(pos3);
                    const offset = Math.asin((2 * spikeScale) / (2 * distanceToSpike1));
                    const angleDistance = getAngleDist(angleToEnemy, angleToSpike);
                    const intersecting = angleDistance <= offset;
                    const overlapping = distanceToTarget <= distanceToSpike1;
                    const inRange = KBDistance !== 0 && target.collidingObject(object, KBDistance);

                    if (intersecting && overlapping && inRange) {
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
            }
        });
    }

    private handleNearest<T extends ENearest>(type: T, enemy: [Player, Animal][T]) {
        const { myPlayer } = this.client;
        const primaryDamage = myPlayer.getMaxWeaponDamage(myPlayer.weapon.primary, false);
        if (primaryDamage >= enemy.currentHealth && this.isNear(enemy, this.nearestLowEntity)) {
            this.nearestLowEntity = enemy;
        }
        
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

    handleAnimal(animal: Animal) {
        this.handleNearest(ENearest.ANIMAL, animal);
        this.handleNearestDangerAnimal(animal);
    }

    attemptSpikePlacement() {
        const { ModuleHandler } = this.client;
        const placementAngles = this.nearestSpikePlacerAngle;
        if (placementAngles === null) return;

        const itemType = ItemType.SPIKE;
        for (const angle of placementAngles) {
            ModuleHandler.place(itemType, angle);
        }
        ModuleHandler.placedOnce = true;
        ModuleHandler.placeAngles[0] = itemType;
        ModuleHandler.placeAngles[1] = placementAngles;
    }

    handleEnemies(enemies: Player[]) {

        // It is important to reset data on each tick
        this.reset();

        const { myPlayer, ObjectManager, PlayerManager } = this.client;
        this.checkCollision(myPlayer, true);

        for (let i=0,len=enemies.length;i<len;i++) {
            const enemy = enemies[i]!;

            this.checkCollision(enemy);
            this.handleDanger(enemy);
            this.handleNearest(ENearest.PLAYER, enemy);
        }

        if (myPlayer.isBullTickTime()) {
            this.potentialDamage += 5;
        }
        // if (myPlayer.wasTrapped()) {
        //     this.potentialSpikeDamage = 45;
        // }
        this.potentialDamage += this.client.ProjectileManager.totalDamage;
        
        const actualSpikeDamage = Math.max(this.potentialSpikeDamage, this.potentialSpikeKnockbackDamage);
        this.potentialSpikeDamage = actualSpikeDamage;
        const potentialDamage = this.potentialDamage + actualSpikeDamage;

        const soldierDefense = Hats[EHat.SOLDIER_HELMET].dmgMult;
        const soldierMult = myPlayer.hatID === EHat.SOLDIER_HELMET ? soldierDefense : 1;
        if (potentialDamage * soldierDefense >= myPlayer.currentHealth) {
            this.detectedDangerEnemy = true;
        } else if (potentialDamage * soldierMult >= myPlayer.currentHealth) {
            this.detectedEnemy = true;
        }

        if (potentialDamage >= myPlayer.currentHealth) {
            this.dangerWithoutSoldier = true;
        }

        const nearest = this.nearestEnemy;
        if (nearest !== null) {
            const pos1 = myPlayer.pos.current;
            const pos2 = nearest.pos.current;
            const angleToEnemy = pos1.angle(pos2);
    
            const itemType = ItemType.SPIKE;
            const spikeID = myPlayer.getItemByType(itemType);
            const placeLength = myPlayer.getItemPlaceScale(spikeID);

            // Checks if it is possible to place spike on nearest enemy
            // Ignores object's health and all objects included while checking
            // This basically simulates ON_OBJECT_REMOVE call
            const angles = ObjectManager.getBestPlacementAngles({
                position: pos1,
                id: spikeID,
                targetAngle: angleToEnemy,
                ignoreID: null,
                preplace: false,
                reduce: false,
                fill: false,
            });
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

            if (settings._autoSync) {
                for (let i=0;i<PlayerManager.players.length;i++) {
                    const player = PlayerManager.players[i]!;
                    if (myPlayer.isMyPlayerByID(player.id)) continue;
                    if (PlayerManager.isEnemyByID(nearest.id, player) && this.isNear(player, this.nearestEnemyToNearestEnemy, nearest)) {
                        this.nearestEnemyToNearestEnemy = player;
                    }
                }
            }
        }

        const nearestEnemyPush = this.nearestEnemyPush;
        if (nearestEnemyPush !== null && myPlayer.trappedIn === null) {
            // const pos = nearestEnemyPush.pos.current;
            const trappedIn = nearestEnemyPush.trappedIn!;
            const pos0 = trappedIn.pos.current;
            ObjectManager.grid2D.query(pos0.x, pos0.y, 2, (id: number) => {
                const object = ObjectManager.objects.get(id)!;
                if (object === trappedIn) return;

                const isPlayerObject = object instanceof PlayerObject;
                const isCactus = !isPlayerObject && object.isCactus;
                const isSpike = isPlayerObject && object.itemGroup === ItemGroup.SPIKE;
                const isTrap = isPlayerObject && object.type === EItem.PIT_TRAP;

                const isEnemyObject = !isPlayerObject || PlayerManager.isEnemyByID(object.ownerID, nearestEnemyPush);
                // if (isEnemyObject && (isCactus || isSpike || isTrap) && this.isNear(object, this.nearestPushSpike, nearestEnemyPush)) {
                if (isEnemyObject && (isCactus || isSpike) && this.isNear(object, this.nearestPushSpike, nearestEnemyPush)) {
                    const pos1 = object.pos.current;
                    const distance = pos0.distance(pos1);
                    const range = object.collisionScale + trappedIn.collisionScale + nearestEnemyPush.collisionScale * 2;
                    // const range = object.placementScale + trappedIn.placementScale + nearestEnemyPush.collisionScale / 2;
                    if (distance <= range) {
                        this.nearestPushSpike = object;
                    }
                }
            });
        }

        if (this.client.isOwner) {
            GameUI.updateSpikeDamage(actualSpikeDamage);
            GameUI.updatePotentialDamage(`${this.potentialDamage}, ${this.primaryDamage}`);
            GameUI.updateDangerState(`${this.detectedDangerEnemy}, ${this.detectedEnemy}, ${this.dangerWithoutSoldier}, ${this.rangedBowInsta}`);
            GameUI.updateCollideSpike(this.collidingSpike);
        }
    }
}

export default EnemyManager;