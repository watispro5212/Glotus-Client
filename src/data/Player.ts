import { fixTo } from './../utility/Common';
import { Glotus } from "..";
import PlayerClient from "../PlayerClient";
import { Items, Projectiles, WeaponVariants } from "../constants/Items";
import { Accessories, Hats } from "../constants/Store";
import HatPredictor from "../modules/HatPredictor";
import type { IReload } from "../types/Common";
import { EDanger } from "../types/Enums";
import { EItem, EProjectile, EWeapon, ItemType, ReloadType, WeaponType, WeaponTypeString, WeaponVariant, type TGlobalInventory, type TMelee, type TPlaceable, type TPrimary, type TSecondary } from "../types/Items";
import { EAccessory, EHat, EStoreType } from "../types/Store";
import { clamp, getAngleDist, removeFast } from "../utility/Common";
import DataHandler from "../utility/DataHandler";
import Logger from "../utility/Logger";
import settings from "../utility/Settings";
import Entity from "./Entity";
import { PlayerObject } from "./ObjectItem";
import Projectile from "./Projectile";

const scale_value = (window as any).grbtp as 35;
delete (window as any).grbtp;

/** Represents all players. */
class Player extends Entity {
    
    /**
     * ID of item player is holding at the current tick
     * 
     * `-1` means player is holding a weapon
     */
    currentItem: EItem | -1 = -1;

    clanName: string | null = null;
    isLeader = false;
    prevNickname: string | null = null;
    nickname: string | null = null;
    skinID = 0;
    override readonly scale = scale_value;

    readonly storeData: [number, number] = [0, 0];
    hatID: EHat = 0;
    prevHat: EHat = 0;
    accessoryID: EAccessory = 0;

    usesTurret = false;

    previousHealth = 100;
    currentHealth = 100;
    tempHealth = 100;
    maxHealth = ((Math as any).LN1) as number;

    primaryReloadTickCount = 0;
    nextDamageTick = 0;
    
    readonly globalInventory = {} as TGlobalInventory;
    readonly weapon = {} as {
        /** ID of weapon player is holding at the current tick */
        current: EWeapon;
        oldCurrent: EWeapon;
        
        /** ID of current primary weapon */
        primary: TPrimary | null;
        
        /** ID of current secondary weapon */
        secondary: TSecondary | null;
    }

    readonly oldWeapon: [EWeapon | null, EWeapon | null] = [0, null];
    readonly variant = {} as {
        current: WeaponVariant;
        primary: WeaponVariant;
        secondary: WeaponVariant;
    }
    
    readonly reload = [{}, {}, {}] as [IReload, IReload, IReload];
    
    /** Set of items placed by the player */
    readonly objects = new Set<PlayerObject>();

    newlyCreated = true;

    /** true, if player is using boost pads, potentially 1 tick user */
    usingBoost = false;

    isTrapped = false;

    /** true, if player is usually using tank to destroy a trap */
    usesTank = false;
    trappedIn: PlayerObject | null = null;
    trappedInPrev: PlayerObject | null = null;

    isFullyUpgraded = false;

    potentialDamage = 0;
    primaryDamage = 0;
    spikeDamage = 0;
    readonly dangerList: EDanger[] = [];
    danger = EDanger.NONE;
    prevDanger = EDanger.NONE;

    readonly hatHistory: number[] = [];
    futureHat: number | null = 0;

    /** true, if player has clown */
    shameActive = false;
    shameTimer = 0;
    shameCount = 0;
    receivedDamage: number | null = null;
    bullTick = 0;
    poisonCount = 0;
    isDmgOverTime = false;
    tickCount = 0;
    damageTick = 0;
    canPlaceSpikePrev = false;
    canPlaceSpike = false;
    velocityTicking = false;
    reverseInsta = false;
    toolHammerInsta = false;
    rangedBowInsta = false;
    spikeSyncThreat = false;
    onPlatform = false;

    tickDamage = 100;
    stackedDamage = 0;
    readonly damages: number[] = [];

    prevSeenBefore = false;
    seenBefore = false;
    readonly isPlayer = true;
    lastAttacked = 0;

    constructor(client: PlayerClient) {
        super(client);
    }

    justAppeared() {
        return !this.prevSeenBefore && this.seenBefore;
    }

    wasTrapped() {
        return this.trappedIn === null && this.trappedInPrev !== null;
    }

    addFound(projectile: Projectile) {
        projectile.ownerClient = this;
        this.client.ProjectileManager.foundProjectile(projectile);
    }

    resetReload() {
        const { primary, secondary } = this.weapon;
        const primarySpeed = this.getWeaponSpeed(primary);
        const secondarySpeed = this.getWeaponSpeed(secondary);
        
        const reload = this.reload;
        reload[ReloadType.PRIMARY].previous = primarySpeed;
        reload[ReloadType.PRIMARY].current = primarySpeed;
        reload[ReloadType.PRIMARY].max = primarySpeed;

        reload[ReloadType.SECONDARY].previous = secondarySpeed;
        reload[ReloadType.SECONDARY].current = secondarySpeed;
        reload[ReloadType.SECONDARY].max = secondarySpeed;

        reload[ReloadType.TURRET].previous = 23;
        reload[ReloadType.TURRET].current = 23;
        reload[ReloadType.TURRET].max = 23;
        this.shameCount = 0;
    }

    private resetGlobalInventory() {
        this.globalInventory[WeaponType.PRIMARY] = null;
        this.globalInventory[WeaponType.SECONDARY] = null;
        this.globalInventory[ItemType.FOOD] = null;
        this.globalInventory[ItemType.WALL] = null;
        this.globalInventory[ItemType.SPIKE] = null;
        this.globalInventory[ItemType.WINDMILL] = null;
        this.globalInventory[ItemType.FARM] = null;
        this.globalInventory[ItemType.TRAP] = null;
        this.globalInventory[ItemType.TURRET] = null;
        this.globalInventory[ItemType.SPAWN] = null;
    }

    init() {
        this.weapon.current = 0;
        this.weapon.oldCurrent = 0;
        this.weapon.primary = null;
        this.weapon.secondary = null;
        this.oldWeapon[0] = null;
        this.oldWeapon[1] = null;

        this.variant.current = 0;
        this.variant.primary = 0;
        this.variant.secondary = 0;

        this.resetReload();
        this.resetGlobalInventory();

        this.newlyCreated = true;
        this.usingBoost = false;
        this.isFullyUpgraded = false;
    }

    get canUseTurret() {
        return this.hatID !== EHat.EMP_HELMET;
    }

    get canPlaceSpikeObject() {
        return (
            !this.canPlaceSpikePrev && this.canPlaceSpike ||
            this.speed >= 10 && this.canPlaceSpike
        );
    }

    isBullTickTime(adjust = 0) {
        return (this.tickCount - this.bullTick - adjust) % 9 === 0; 
    }

    update(
        id: number,
        x: number,
        y: number,
        angle: number,
        currentItem: EItem | -1,
        currentWeapon: EWeapon,
        weaponVariant: WeaponVariant,
        clanName: string | null,
        isLeader: 1 | 0,
        hatID: EHat,
        accessoryID: EAccessory,
        hasSkull: 1 | 0,
        onPlatform: 1 | 0,
    ) {
        this.prevSeenBefore = this.seenBefore;
        this.seenBefore = true;
        if (this.justAppeared()) {
            this.resetReload();
        }
        this.tickCount += 1;
        this.id = id;

        this.pos.previous.setVec(this.pos.current);
        this.pos.current._setXY(x, y);
        this.setFuturePosition();

        this.angle = angle;
        this.currentItem = currentItem;
        this.weapon.oldCurrent = this.weapon.current;
        const weaponType = DataHandler.getWeapon(this.weapon.current).itemType;
        this.oldWeapon[weaponType] = this.weapon.current;
        this.weapon.current = currentWeapon;
        this.variant.current = weaponVariant;
        this.clanName = clanName;
        this.isLeader = Boolean(isLeader);
        this.onPlatform = Boolean(onPlatform);
        this.prevHat = this.hatID;
        this.hatID = hatID;
        if (
            this.prevHat === EHat.BULL_HELMET &&
            hatID === EHat.TURRET_GEAR
        ) {
            this.usesTurret = true;
        }

        this.hatHistory.push(hatID);
        if (this.hatHistory.length > 4) {
            this.hatHistory.shift();
        }
        this.futureHat = null;
        if (this.usesTurret && hatID === EHat.BULL_HELMET) {
            this.futureHat = EHat.TURRET_GEAR;
        }

        this.accessoryID = accessoryID;
        this.storeData[EStoreType.HAT] = hatID;
        this.storeData[EStoreType.ACCESSORY] = accessoryID;
        this.newlyCreated = false;
        this.potentialDamage = 0;
        this.primaryDamage = 0;
        this.spikeDamage = 0;

        this.canPlaceSpikePrev = this.canPlaceSpike;
        this.canPlaceSpike = false;
        this.velocityTicking = false;
        this.reverseInsta = false;
        this.toolHammerInsta = false;
        this.rangedBowInsta = false;
        this.spikeSyncThreat = false;

        this.predictItems();
        this.predictWeapons();
        this.updateReloads();

        this.isDmgOverTime = false;
        if (this.hatID === EHat.SHAME && !this.shameActive) {
            this.shameActive = true;
            this.shameTimer = 0;
            this.shameCount = 8;
        }

        const { PlayerManager, myPlayer: myPlayer } = this.client;
        this.shameTimer += PlayerManager.step;
        if (this.shameTimer >= 30000 && this.shameActive) {
            this.shameActive = false;
            this.shameTimer = 0;
            this.shameCount = 0;
        }

        if (this.isBullTickTime()) {
            if (this.shameCount > 0) {
                this.futureHat = EHat.BULL_HELMET;
            }

            this.poisonCount = Math.max(this.poisonCount - 1, 0);
        }

        if (this.futureHat === null) {
            HatPredictor.train(this.hatHistory);
            this.futureHat = HatPredictor.predict(hatID);
        }
        // this.updateStackedDamage();

        const reload = this.reload;
        reload[ReloadType.PRIMARY].previous = reload[ReloadType.PRIMARY].current;
        reload[ReloadType.SECONDARY].previous = reload[ReloadType.SECONDARY].current;
        reload[ReloadType.TURRET].previous = reload[ReloadType.TURRET].current;
    }

    // updateStackedDamage() {
    //     const isEnemy = this.client.myPlayer.isEnemyByID(this.id);
    //     if (isEnemy && this.stackedDamage !== 0 && settings._stackedDamage) {
    //         const pos = this.pos.current;
    //         Glotus.hooks.showText(pos.x, pos.y, this.stackedDamage, 1, true);
    //     }
    //     this.stackedDamage = 0;
    // }

    updateHealth(health: number) {
        this.previousHealth = this.currentHealth;
        this.currentHealth = health;
        this.tempHealth = health;

        if (this.shameActive) return;
        
        const { myPlayer: myPlayer, PlayerManager } = this.client;
        const isEnemy = myPlayer.isEnemyByID(this.id);
        const { currentHealth, previousHealth } = this;
        const difference = Math.abs(currentHealth - previousHealth);

        // Shame count should be changed only when healing
        if (this.currentHealth < this.previousHealth) {
            this.receivedDamage = Date.now();

            if (this.damageTick !== this.tickCount + 1) {
                this.tickDamage = 0;
                this.stackedDamage = 0;
                this.damages.length = 0;
            }
            this.tickDamage += difference;
            this.damageTick = (this.tickCount + 1);

            if (isEnemy) {
                PlayerManager.lastEnemyReceivedDamage[0] = this.id;
                PlayerManager.lastEnemyReceivedDamage[1] = Math.round(difference);
            }
        } else if (this.receivedDamage !== null) {
            const step = Date.now() - this.receivedDamage;
            this.receivedDamage = null;

            if (step <= 120) {
                this.shameCount += 1;
            } else {
                this.shameCount -= 2;
            }
            this.shameCount = clamp(this.shameCount, 0, 7);
        }

        const diffDmg = difference === 5 || difference === 2 || difference === 4;
        const isDmgOverTime = diffDmg && currentHealth < previousHealth;
        this.isDmgOverTime = isDmgOverTime;

        if (isDmgOverTime) {
            this.bullTick = this.tickCount;
        }
    }

    private predictItems() {
        if (this.currentItem === -1) return;

        const item = Items[this.currentItem];
        this.globalInventory[item.itemType] = this.currentItem as EItem & null;
    }

    private increaseReload(reload: IReload) {
        reload.previous = reload.current;
        reload.current += 1;
        if (reload.current > reload.max) {
            reload.current = reload.max;
        }
    }

    updateMaxReload(reload: IReload, weaponID: EWeapon) {
        const speed = this.getWeaponSpeed(weaponID);
        reload.current = speed;
        reload.max = speed;
    }

    resetCurrentReload(reload: IReload) {
        reload.current = 0;
    }
    
    private updateTurretReload() {
        const reload = this.reload[ReloadType.TURRET];
        this.increaseReload(reload);
        if (this.hatID !== EHat.TURRET_GEAR) return;

        const { ProjectileManager } = this.client;
        const speed = Projectiles[1].speed;
        const list = ProjectileManager.projectiles.get(speed);
        if (list === undefined) return;

        const current = this.pos.current;
        for (let i=0;i<list.length;i++) {
            const projectile = list[i]!;
            const distance = current.distance(projectile.pos.current);
            if (distance < 5) {
                this.addFound(projectile);
                this.resetCurrentReload(reload);
                removeFast(list, i);
                break;
            }
        }
    }

    private updateReloads() {
        this.updateTurretReload();

        // We should not reload if player is holding item
        if (this.currentItem !== -1) return;
        
        const weapon = DataHandler.getWeapon(this.weapon.current);
        const reload = this.reload[weapon.itemType];

        this.increaseReload(reload);

        // Handle reloading of shootable weapons
        if ("projectile" in weapon) {
            const { ProjectileManager } = this.client;
            const speedMult = this.getWeaponSpeedMult();
            const type = weapon.projectile;
            const speed = Projectiles[type].speed * speedMult;
            const list = ProjectileManager.projectiles.get(speed);
            if (list === undefined) return;

            // It won't work if players have the same position, angle, hats and ranged weapons
            // I could potentially check for secondary weapon reloading
            const current = this.pos.current;
            for (let i=0;i<list.length;i++) {
                const projectile = list[i]!;
                const distance = current.distance(projectile.pos.current);
                if (distance < 5 && this.angle === projectile.angle) {
                    this.addFound(projectile);
                    this.updateMaxReload(reload, weapon.id);
                    this.resetCurrentReload(reload);
                    removeFast(list, i);
                    break;
                }
            }
        }
    }

    handleObjectPlacement(object: PlayerObject) {
        this.objects.add(object);

        const { myPlayer: myPlayer, ObjectManager } = this.client;
        const item = Items[object.type];
        if (object.seenPlacement) {
            if (object.type === EItem.TURRET) {
                ObjectManager.resetTurret(object.id);
            } else if (object.type === EItem.BOOST_PAD && !this.newlyCreated) {
                this.usingBoost = true;
            }

            this.updateInventory(object.type);
        }

        if (myPlayer.isMyPlayerByID(this.id) && item.itemType === ItemType.WINDMILL) {
            myPlayer.totalGoldAmount += item.pps;
        }
    }

    handleObjectDeletion(object: PlayerObject) {
        this.objects.delete(object);

        const { myPlayer: myPlayer } = this.client;
        const item = Items[object.type];
        if (myPlayer.isMyPlayerByID(this.id) && item.itemType === ItemType.WINDMILL) {
            myPlayer.totalGoldAmount -= item.pps;
        }
    }

    /** Updates the player's inventory based on the placed item */
    private updateInventory(type: TPlaceable) {
        const item = Items[type];
        const inventoryID = this.globalInventory[item.itemType];
        const shouldUpdate = inventoryID === null || item.age > Items[inventoryID].age;
        if (shouldUpdate) {
            this.globalInventory[item.itemType] = item.id as ItemType & null;
        }
    }

    /** Based on the player's already known weapons and items, calculates whether the player is fully upgraded */
    private detectFullUpgrade() {
        const inventory = this.globalInventory;
        const primary = inventory[WeaponType.PRIMARY];
        const secondary = inventory[WeaponType.SECONDARY];
        const spike = inventory[ItemType.SPIKE];

        if (primary && secondary) {
            if (
                "isUpgrade" in DataHandler.getWeapon(primary) &&
                "isUpgrade" in DataHandler.getWeapon(secondary)
            ) return true;
        }

        return (
            primary && DataHandler.getWeapon(primary).age === 8 ||
            secondary && DataHandler.getWeapon(secondary).age === 9 ||
            spike && Items[spike].age === 9 ||
            inventory[ItemType.WINDMILL] === EItem.POWER_MILL ||
            inventory[ItemType.SPAWN] === EItem.SPAWN_PAD
        )
    }

    private predictPrimary(id: TSecondary) {
        if (id === EWeapon.WOODEN_SHIELD) return EWeapon.KATANA;
        return EWeapon.POLEARM;
    }

    private predictSecondary(id: TPrimary) {
        if (id === EWeapon.TOOL_HAMMER) return null;
        if (id === EWeapon.GREAT_AXE || id === EWeapon.KATANA) return EWeapon.GREAT_HAMMER;
        return EWeapon.MUSKET;
    }

    private predictWeapons() {
        const { current, oldCurrent } = this.weapon;
        const weapon = DataHandler.getWeapon(current);
        const type = WeaponTypeString[weapon.itemType];
        const reload = this.reload[weapon.itemType];

        // May not work if attacked, switched to other type and upgraded previous type
        const oldWeapon = this.oldWeapon[weapon.itemType];
        // const upgradedWeapon = current !== oldCurrent && weapon.itemType === DataHandler.getWeapon(oldCurrent).itemType;
        const upgradedWeapon = oldWeapon === null || current !== oldWeapon && weapon.itemType === DataHandler.getWeapon(oldWeapon).itemType;
        if (reload.max === -1 || upgradedWeapon) {
            this.updateMaxReload(reload, weapon.id);
        }
        
        this.globalInventory[weapon.itemType] = current as EWeapon & null;
        this.variant[type] = this.variant.current;

        const currentType = this.weapon[type];
        if (currentType === null || weapon.age > DataHandler.getWeapon(currentType).age) {
            this.weapon[type] = current as EWeapon & null;
        }

        const primary = this.globalInventory[WeaponType.PRIMARY];
        const secondary = this.globalInventory[WeaponType.SECONDARY];
        const notPrimaryUpgrade = primary === null || !("isUpgrade" in DataHandler.getWeapon(primary));
        const notSecondaryUpgrade = secondary === null || !("isUpgrade" in DataHandler.getWeapon(secondary));

        // Player can hold only one type of item, primary or secondary. Based on current weapon id, we predict other weapon type
        // Doesn't work correctly if player has already shown both types of weapons and at the same time hasn't fully upgraded
        if (DataHandler.isSecondary(current) && notPrimaryUpgrade) {
            const predicted = this.predictPrimary(current);
            if (primary === null || DataHandler.getWeapon(predicted).upgradeType === DataHandler.getWeapon(primary).upgradeType) {
                this.weapon.primary = predicted;
            }
        } else if (DataHandler.isPrimary(current) && notSecondaryUpgrade) {
            const predicted = this.predictSecondary(current);
            if (predicted === null || secondary === null || DataHandler.getWeapon(predicted).upgradeType === DataHandler.getWeapon(secondary).upgradeType) {
                this.weapon.secondary = predicted;
            }
        }
        
        // Update weapons if it is already known that the player is fully upgraded
        this.isFullyUpgraded = this.detectFullUpgrade();
        if (this.isFullyUpgraded) {
            // If some weapon is not yet known, leave the predicted
            if (primary !== null) this.weapon.primary = primary;
            if (secondary !== null) this.weapon.secondary = secondary;
        }

        if (this.weapon.primary === undefined) {
            throw new Error("Primary is 'undefined', value must be at least 'null' or 'number'");
        }

        if (this.weapon.secondary === undefined) {
            throw new Error("Secondary is 'undefined', value must be at least 'null' or 'number'");
        }
    }

    getWeaponVariant(id: EWeapon | null) {
        const type = DataHandler.getWeapon(id || EWeapon.TOOL_HAMMER).itemType;
        const variant = this.variant[WeaponTypeString[type]];
        return {
            current: variant,
            next: Math.min(variant + 1, WeaponVariant.RUBY) as WeaponVariant,
        } as const;
    }

    /** Returns the number of damage, that can be dealt by the player weapon to buildings */
    getBuildingDamage(id: TMelee, isTank = false): number {
        const weapon = DataHandler.getWeapon(id);
        const variant = WeaponVariants[this.getWeaponVariant(id).current];

        let damage = weapon.damage * variant.val;
        if ("sDmg" in weapon) {
            damage *= weapon.sDmg;
        }

        const hat = Hats[isTank ? EHat.TANK_GEAR : this.hatID];
        if ("bDmg" in hat) {
            damage *= hat.bDmg;
        }
        return damage;
    }

    getMaxBuildingDamage(object: PlayerObject, isTank = true) {
        const { primary, secondary } = this.weapon;

        if (DataHandler.isMelee(secondary) && secondary === EWeapon.GREAT_HAMMER && this.isReloaded(ReloadType.SECONDARY, 1)) {
            if (this.collidingSimple(object, DataHandler.getWeapon(secondary).range + object.hitScale)) {
                return this.getBuildingDamage(secondary, isTank);
            }
        }

        if (DataHandler.isMelee(primary) && this.isReloaded(ReloadType.PRIMARY, 1)) {
            if (this.collidingSimple(object, DataHandler.getWeapon(primary).range + object.hitScale)) {
                return this.getBuildingDamage(primary, isTank);
            }
        }
        
        return null;
    }

    canDealPoison(weaponID: TMelee) {
        const variant = this.getWeaponVariant(weaponID).current;
        const isRuby = variant === WeaponVariant.RUBY;
        const hasPlague = this.hatID === EHat.PLAGUE_MASK;
        return {
            isAble: isRuby || hasPlague,
            count: isRuby ? 5 : hasPlague ? 6 : 0
        } as const;
    }

    getWeaponSpeed(id: EWeapon | null, hat = this.hatID): number {
        if (id === null) return -1;
        const reloadSpeed = hat === EHat.SAMURAI_ARMOR ? Hats[hat].atkSpd : 1;
        const speed = DataHandler.getWeapon(id).speed * reloadSpeed;
        return Math.ceil(speed / this.client.SocketManager.TICK);
    }

    getWeaponSpeedMult() {
        if (this.hatID === EHat.MARKSMAN_CAP) {
            return Hats[this.hatID].aMlt;
        }
        return 1;
    }

    getMaxWeaponRange() {
        const { primary, secondary } = this.weapon;
        const primaryRange = DataHandler.getWeapon(primary!).range;
        if (DataHandler.isMelee(secondary)) {
            const range = DataHandler.getWeapon(secondary).range;
            if (range > primaryRange) {
                return range;
            }
        }
        return primaryRange;
    }

    getWeaponRange(weaponID: EWeapon | null) {
        if (weaponID === null) return 0;
        const range = DataHandler.getWeapon(weaponID).range;
        if (DataHandler.isMelee(weaponID)) {
            return range + this.hitScale;
        }

        return range + this.collisionScale;
    }

    /** Returns the maximum possible damage of the specified weapon to entities, including bull and weapon level */
    getMaxWeaponDamage(id: EWeapon | null, lookingShield: boolean, addBull = true): number {
        if (DataHandler.isMelee(id)) {
            const bull = Hats[EHat.BULL_HELMET];
            const variant = this.getWeaponVariant(id).current;
            let damage = DataHandler.getWeapon(id).damage;
            if (addBull) {
                damage *= bull.dmgMultO;
            }
            damage *= WeaponVariants[variant].val;
            if (lookingShield) {
                damage *= DataHandler.getWeapon(EWeapon.WOODEN_SHIELD).shield;
            }
            return damage;
        } else if (DataHandler.isShootable(id) && !lookingShield) {
            const projectile = DataHandler.getProjectile(id);
            return projectile.damage;
        }
        return 0;
    }

    getMaxKnockback() {
        let knockback = 60;

        const { primary, secondary } = this.weapon;
        if (primary != null) {
            knockback += DataHandler.getWeapon(primary).knockback;
        }

        if (secondary != null) {
            knockback += DataHandler.getWeapon(secondary).knockback;
        }
        return knockback;
    }

    getPrimaryKnockback(target: Player) {
        const { primary } = this.weapon;

        if (primary !== null && this.isReloaded(ReloadType.PRIMARY, 1)) {
            const { range, knockback } = DataHandler.getWeapon(primary);
            if (this.collidingEntity(target, range)) {
                return knockback;
            }
        }

        return 0;
    }

    getActualMaxKnockback(target: Player) {
        let output = 0;
        const { primary, secondary } = this.weapon;

        const hitScale = target.hitScale;
        if (primary !== null && this.isReloaded(ReloadType.PRIMARY, 1)) {
            const { range, knockback } = DataHandler.getWeapon(primary);
            if (this.collidingEntity(target, range + hitScale)) {
                output += knockback;
            }
        }

        if (secondary !== null && this.isReloaded(ReloadType.SECONDARY, 1)) {
            const { range, knockback } = DataHandler.getWeapon(secondary);
            if (this.collidingEntity(target, range + hitScale)) {
                output += knockback;
            }
        }

        if (this.isReloaded(ReloadType.TURRET, 1)) {
            if (this.collidingEntity(target, 700 + hitScale)) {
                output += 60;
            }
        }

        return output;
    }

    getItemPlaceScale(itemID: TPlaceable) {
        const item = Items[itemID];
        return this.scale + item.scale + item.placeOffset;
    }

    isReloaded(type: ReloadType, tick: number) {
        const reload = this.reload[type].current;
        const max = this.reload[type].max - tick;
        return reload >= max;
    }

    atExact(type: ReloadType, tick: number) {
        const { current, max } = this.reload[type];
        return current === (max - tick);
    }

    isEmptyReload(type: ReloadType) {
        const reload = this.reload[type].current;
        return reload === 0;
    }

    private detectSpikeInsta() {
        const { myPlayer: myPlayer, ObjectManager } = this.client;
        const spikeID = this.globalInventory[ItemType.SPIKE] || EItem.SPINNING_SPIKES;
        const placeLength = this.getItemPlaceScale(spikeID);

        const pos1 = this.pos.current;
        const pos2 = myPlayer.pos.current;
        const angleToMyPlayer = pos1.angle(pos2);

        const spike = Items[spikeID];
        const range = this.collisionScale + spike.scale;
        const straightSpikePos = pos1.addDirection(angleToMyPlayer, placeLength);
        const distance = pos2.distance(straightSpikePos);
        if (distance > range) return 0;

        // const trappedInID = myPlayer.trappedIn !== null && myPlayer.trappedIn.canBeDestroyed ? myPlayer.trappedIn.id : null;
        const angles = ObjectManager.getBestPlacementAngles({
            position: pos1,
            id: spikeID,
            targetAngle: angleToMyPlayer,
            ignoreID: null,
            preplace: false,
            reduce: false,
            fill: false,
        });
        for (const angle of angles) {
            const spikePos = pos1.addDirection(angle, placeLength);
            const distance = pos2.distance(spikePos);
            if (distance <= range) {
                return spike.damage;
            }
        }
        return 0;
    }

    canPossiblyInstakill(): EDanger {
        const { PlayerManager, myPlayer: myPlayer } = this.client;
        const lookingShield = PlayerManager.lookingShield(myPlayer, this);

        const { primary, secondary } = this.weapon;
        const primaryDamage = this.getMaxWeaponDamage(primary, lookingShield);
        const secondaryDamage = this.getMaxWeaponDamage(secondary, lookingShield);

        const addRange = this.isTrapped ? 30 : 130;
        const boostRange = this.usingBoost && !this.isTrapped ? 430 : addRange;
        const primaryRange = this.getWeaponRange(primary) + boostRange;
        const secondaryRange = this.getWeaponRange(secondary) + addRange;
        const turretRange = 700 + addRange;
        const primaryReloaded = this.isReloaded(ReloadType.PRIMARY, 1);
        const primaryVariant = this.getWeaponVariant(primary).current;
        const isDiamondPolearm = primary === EWeapon.POLEARM && primaryVariant >= WeaponVariant.DIAMOND;

        const collidingPrimary = myPlayer.collidingEntity(this, primaryRange);
        const collidingSecondary = myPlayer.collidingEntity(this, DataHandler.isShootable(secondary) ? primaryRange : secondaryRange);
        const collidingTurret = myPlayer.collidingEntity(this, turretRange);

        let spikeSyncDamage = 0;
        let includeTurret = false;
        if (collidingPrimary) {
            if (primaryReloaded) {
                this.potentialDamage += primaryDamage;
                this.primaryDamage = primaryDamage;
                spikeSyncDamage += primaryDamage;
            }
            includeTurret = true;
        }

        if (collidingSecondary) {
            if (this.isReloaded(ReloadType.SECONDARY, 1)) {
                this.potentialDamage += secondaryDamage;
            }

            if (DataHandler.isMelee(secondary)) {
                includeTurret = true;
            }
        }

        if (
            this.isReloaded(ReloadType.TURRET, 1) &&
            includeTurret &&
            !lookingShield
        ) {
            this.potentialDamage += 25;
        }

        if (
            collidingPrimary &&
            collidingTurret &&
            this.isEmptyReload(ReloadType.TURRET) &&
            primaryReloaded &&
            isDiamondPolearm
        ) {
            this.velocityTicking = true;
        }

        if (
            collidingPrimary &&
            collidingSecondary &&
            collidingTurret &&
            this.isEmptyReload(ReloadType.SECONDARY) &&
            this.isEmptyReload(ReloadType.TURRET) &&
            primaryReloaded
        ) {
            this.reverseInsta = true;
        }

        if (
            collidingPrimary &&
            (
                this.weapon.oldCurrent === EWeapon.TOOL_HAMMER && this.weapon.current === EWeapon.POLEARM ||
                this.weapon.current === EWeapon.TOOL_HAMMER && this.isEmptyReload(ReloadType.PRIMARY) && this.hatID === EHat.BULL_HELMET
            )
        ) {
            this.toolHammerInsta = true;
        }

        const pos1 = this.pos.current;
        const pos2 = myPlayer.pos.current;
        const distance = pos1.distance(pos2);
        const angle = pos1.angle(pos2);
        const offset = Math.asin((2 * myPlayer.scale) / (2 * distance));
        const lookingAt = getAngleDist(angle, this.angle) <= offset;

        const { current, oldCurrent } = this.weapon;
        const bowDetect = (
            current === EWeapon.HUNTING_BOW && oldCurrent !== EWeapon.HUNTING_BOW ||
            current === EWeapon.CROSSBOW && oldCurrent === EWeapon.HUNTING_BOW ||
            current === EWeapon.MUSKET && oldCurrent === EWeapon.CROSSBOW
        );

        if (distance > 300 && lookingAt && bowDetect) {
            this.rangedBowInsta = true;
        }

        // TODO: improve overall enemy detection. Different types of spiketicks, knockbacks etc.
        // if (!lookingShield) {
        //     const hasTurret = this.foundProjectiles.has(EProjectile.TURRET);
        //     const hasBow = this.foundProjectiles.has(EProjectile.BOW);
        //     if (hasTurret && hasBow) {
        //         return EDanger.SUPER_HIGH;
        //     }
        // }
        const spikeDamage = this.detectSpikeInsta();
        if (spikeDamage !== 0) {
            this.canPlaceSpike = true;
            this.spikeDamage = spikeDamage;

            spikeSyncDamage += spikeDamage;
            if (spikeSyncDamage >= 100) {
                this.spikeSyncThreat = true;
            }
        }
        // this.potentialDamage += spikeDamage;
        
        const soldierDefense = Hats[EHat.SOLDIER_HELMET].dmgMult;
        if (this.potentialDamage * soldierDefense >= myPlayer.currentHealth) {
            return EDanger.HIGH;
        }

        const soldierMult = myPlayer.hatID === EHat.SOLDIER_HELMET ? soldierDefense : 1;
        if (this.potentialDamage * soldierMult >= myPlayer.currentHealth) {
            return EDanger.MEDIUM;
        }

        return EDanger.NONE;
    }
}

export default Player;