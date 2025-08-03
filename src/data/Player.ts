import PlayerClient from "../PlayerClient";
import { Items, Projectiles, WeaponVariants } from "../constants/Items";
import { Accessories, Hats } from "../constants/Store";
import HatPredictor from "../modules/HatPredictor";
import type { IReload } from "../types/Common";
import { EDanger } from "../types/Enums";
import { EItem, EProjectile, EWeapon, ItemType, ReloadType, WeaponType, WeaponTypeString, WeaponVariant, type TGlobalInventory, type TMelee, type TPlaceable, type TPrimary, type TSecondary } from "../types/Items";
import { EAccessory, EHat, EStoreType } from "../types/Store";
import { clamp, removeFast } from "../utility/Common";
import DataHandler from "../utility/DataHandler";
import Logger from "../utility/Logger";
import Entity from "./Entity";
import { PlayerObject } from "./ObjectItem";
import Projectile from "./Projectile";

/** Represents all players. */
class Player extends Entity {
    
    socketID = "";
    /**
     * ID of item player is holding at the current tick
     * 
     * `-1` means player is holding a weapon
     */
    currentItem: EItem | -1 = -1;

    clanName: string | null = null;
    isLeader = false;
    nickname = "unknown";
    skinID = 0;
    override readonly scale = 35;

    readonly storeData: [number, number] = [0, 0];
    hatID: EHat = 0;
    prevHat: EHat = 0;
    accessoryID: EAccessory = 0;

    usesTurret = false;

    private totalStorePrice = 0;
    readonly storeList = [
        new Set<number>(),
        new Set<number>(),
    ] as const;

    previousHealth = 100;
    currentHealth = 100;
    tempHealth = 100;
    maxHealth = 100;
    
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
    
    protected readonly variant = {} as {
        current: WeaponVariant;
        primary: WeaponVariant;
        secondary: WeaponVariant;
    }
    
    readonly reload = [{}, {}, {}] as [IReload, IReload, IReload];
    
    /** Set of items placed by the player */
    readonly objects = new Set<PlayerObject>();

    /** Last or current amount of gold player had in leaderboard */
    totalGold = 0;

    /** true, if player is currently in leaderboard */
    inLeaderboard = false;
    newlyCreated = true;

    /** true, if player is using boost pads, potentially 1 tick user */
    usingBoost = false;

    isTrapped = false;
    trappedIn: PlayerObject | null = null;
    trappedInPrev: PlayerObject | null = null;

    /** true, if player is currently standing on platform */
    onPlatform = false;

    /** true, if player is currently standing on boostpad */
    onBoostPad = false;
    isFullyUpgraded = false;

    private potentialDamage = 0;
    readonly foundProjectiles = new Map<number, Projectile[]>();
    readonly dangerList: EDanger[] = [];
    danger = EDanger.NONE;

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

    constructor(client: PlayerClient) {
        super(client);
        this.init();
    }

    wasTrapped() {
        return this.trappedIn === null && this.trappedInPrev !== null;
    }

    private hasFound(projectile: Projectile) {
        const key = projectile.type;
        return this.foundProjectiles.has(key);
    }

    addFound(projectile: Projectile) {
        const key = projectile.type;
        if (!this.foundProjectiles.has(key)) {
            this.foundProjectiles.set(key, []);
        }

        const list = this.foundProjectiles.get(key)!;
        list.push(projectile);
    }

    resetReload() {
        const { primary, secondary } = this.weapon;
        const primarySpeed = primary !== null ? this.getWeaponSpeed(primary) : -1;
        const secondarySpeed = secondary !== null ? this.getWeaponSpeed(secondary) : -1;
        
        const reload = this.reload;
        reload[ReloadType.PRIMARY].current = primarySpeed;
        reload[ReloadType.PRIMARY].max = primarySpeed;

        reload[ReloadType.SECONDARY].current = secondarySpeed;
        reload[ReloadType.SECONDARY].max = secondarySpeed;

        reload[ReloadType.TURRET].current = 2500;
        reload[ReloadType.TURRET].max = 2500;
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

        this.variant.current = 0;
        this.variant.primary = 0;
        this.variant.secondary = 0;

        this.resetReload();
        this.resetGlobalInventory();

        this.newlyCreated = true;
        this.usingBoost = false;
        this.isFullyUpgraded = false;
        this.foundProjectiles.clear();
    }

    get canUseTurret() {
        return this.hatID !== EHat.EMP_HELMET;
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
        isSkull: 1 | 0
    ) {
        this.tickCount += 1;
        this.id = id;

        this.pos.previous.setVec(this.pos.current);
        this.pos.current.setXY(x, y);
        this.setFuturePosition();

        this.angle = angle;
        this.currentItem = currentItem;
        this.weapon.oldCurrent = this.weapon.current;
        this.weapon.current = currentWeapon;
        this.variant.current = weaponVariant;
        this.clanName = clanName;
        this.isLeader = Boolean(isLeader);
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
        HatPredictor.train(this.hatHistory);
        this.futureHat = HatPredictor.predict(hatID);
        if (this.usesTurret && hatID === EHat.BULL_HELMET) {
            this.futureHat = EHat.TURRET_GEAR;
        }

        this.accessoryID = accessoryID;
        this.storeData[EStoreType.HAT] = hatID;
        this.storeData[EStoreType.ACCESSORY] = accessoryID;
        if (!this.storeList[EStoreType.HAT].has(hatID)) {
            this.storeList[EStoreType.HAT].add(hatID);
            this.totalStorePrice += Hats[hatID].price;
        }
        if (!this.storeList[EStoreType.ACCESSORY].has(accessoryID)) {
            this.storeList[EStoreType.ACCESSORY].add(accessoryID);
            this.totalStorePrice += Accessories[accessoryID].price;
        }
        this.newlyCreated = false;
        this.potentialDamage = 0;
        this.predictItems();
        this.predictWeapons();
        this.updateReloads();

        this.isDmgOverTime = false;
        if (this.hatID === EHat.SHAME && !this.shameActive) {
            this.shameActive = true;
            this.shameTimer = 0;
            this.shameCount = 8;
        }

        const { PlayerManager } = this.client;
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
    }

    updateHealth(health: number) {
        this.previousHealth = this.currentHealth;
        this.currentHealth = health;
        this.tempHealth = health;

        if (this.shameActive) return;
        
        // Shame count should be changed only when healing
        if (this.currentHealth < this.previousHealth) {
            this.receivedDamage = Date.now();
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

        const { currentHealth, previousHealth } = this;
        const difference = Math.abs(currentHealth - previousHealth);
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
        reload.current = Math.min(reload.current + this.client.PlayerManager.step, reload.max);
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
            if (distance < 2) {
                if (this.hasFound(projectile)) {
                    this.foundProjectiles.clear();
                }
                this.addFound(projectile);
                projectile.owner = this;

                reload.current = 0;
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
                if (distance < 2 && this.angle === projectile.angle) {
                    if (this.hasFound(projectile)) {
                        this.foundProjectiles.clear();
                    }
                    this.addFound(projectile);
                    projectile.owner = this;

                    reload.current = 0;
                    reload.max = this.getWeaponSpeed(weapon.id);
                    removeFast(list, i);
                    break;
                }
            }
        }

    }

    handleObjectPlacement(object: PlayerObject) {
        this.objects.add(object);

        const { myPlayer, ObjectManager } = this.client;
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

        const { myPlayer } = this.client;
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
        const upgradedWeapon = current !== oldCurrent && weapon.itemType === DataHandler.getWeapon(oldCurrent).itemType;
        if (reload.max === -1 || upgradedWeapon) {
            reload.current = weapon.speed;
            reload.max = weapon.speed;
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
    }

    getWeaponVariant(id: EWeapon) {
        const type = DataHandler.getWeapon(id).itemType;
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

    getMaxBuildingDamage(object: PlayerObject) {
        const { primary, secondary } = this.weapon;

        if (DataHandler.isMelee(secondary) && secondary === EWeapon.GREAT_HAMMER) {
            if (this.collidingSimple(object, DataHandler.getWeapon(secondary).range + object.hitScale)) {
                return this.getBuildingDamage(secondary, true);
            }
        }

        if (DataHandler.isMelee(primary)) {
            if (this.collidingSimple(object, DataHandler.getWeapon(primary).range + object.hitScale)) {
                return this.getBuildingDamage(primary, true);
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

    getWeaponSpeed(id: EWeapon, hat = this.hatID): number {
        const reloadSpeed = hat === EHat.SAMURAI_ARMOR ? Hats[hat].atkSpd : 1;
        return DataHandler.getWeapon(id).speed * reloadSpeed;
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
    getMaxWeaponDamage(id: EWeapon | null, lookingShield: boolean): number {
        if (DataHandler.isMelee(id)) {
            const bull = Hats[EHat.BULL_HELMET];
            const variant = this.getWeaponVariant(id).current;
            let damage = DataHandler.getWeapon(id).damage;
            damage *= bull.dmgMultO;
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
        if (primary !== null) {
            knockback += DataHandler.getWeapon(primary).knockback;
        }

        if (secondary !== null) {
            knockback += DataHandler.getWeapon(secondary).knockback;
        }
        return knockback;
    }

    getItemPlaceScale(itemID: TPlaceable) {
        const item = Items[itemID];
        return this.scale + item.scale + item.placeOffset;
    }

    isReloaded(type: ReloadType, tick = this.client.SocketManager.TICK * 2) {
        const reload = this.reload[type].current;
        const max = this.reload[type].max - tick;
        return reload >= max;
    }

    private detectSpikeInsta() {
        const { myPlayer, ObjectManager } = this.client;
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

        const angles = ObjectManager.getBestPlacementAngles(pos1, spikeID, angleToMyPlayer, null, false, false);
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
        const { PlayerManager, myPlayer } = this.client;
        const lookingShield = PlayerManager.lookingShield(myPlayer, this);

        const { primary, secondary } = this.weapon;
        const primaryDamage = this.getMaxWeaponDamage(primary, lookingShield);
        const secondaryDamage = this.getMaxWeaponDamage(secondary, lookingShield);

        const addRange = this.isTrapped ? 0 : 65;
        const boostRange = this.usingBoost && !this.isTrapped ? 400 : addRange;
        const primaryRange = this.getWeaponRange(primary) + boostRange;
        const secondaryRange = this.getWeaponRange(secondary) + addRange;
        const turretRange = 700 + addRange;

        if (
            this.isReloaded(ReloadType.PRIMARY) &&
            myPlayer.collidingEntity(this, primaryRange)
        ) {
            this.potentialDamage += primaryDamage;
        }

        if (
            this.isReloaded(ReloadType.SECONDARY) &&
            myPlayer.collidingEntity(this, secondaryRange)
        ) {
            const turrets = this.foundProjectiles.get(EProjectile.TURRET);
            this.foundProjectiles.clear();
            if (turrets !== undefined) {
                this.foundProjectiles.set(EProjectile.TURRET, turrets);
            }
            this.potentialDamage += secondaryDamage;
        }

        if (
            this.isReloaded(ReloadType.TURRET) &&
            myPlayer.collidingEntity(this, turretRange) && 
            !lookingShield
        ) {
            this.potentialDamage += 25;
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
        this.potentialDamage += spikeDamage;
        
        const soldierDefense = Hats[EHat.SOLDIER_HELMET].dmgMult;
        if (this.potentialDamage * soldierDefense >= 100) {
            return EDanger.HIGH;
        }
                
        if (this.potentialDamage >= 100) {
            return EDanger.MEDIUM;
        }

        return EDanger.NONE;
    }
}

export default Player;