import PlayerClient from "../PlayerClient";
import { EAttack, ESentAngle } from "../types/Enums";
import { ItemType, ReloadType, WeaponType} from "../types/Items";
import { EHat, EStoreType } from "../types/Store";
import DataHandler from "../utility/DataHandler";
import { reverseAngle } from "../utility/Common";
import Vector from "../modules/Vector";
import TempData from "./bot-modules/TempData";
import Movement from "./bot-modules/Movement";
import GameUI from "../UI/GameUI";
import ClanJoiner from "./bot-modules/ClanJoiner";
import Autobreak from "./modules/combat/Autobreak";
import AutoPlacer from "./modules/combat/AutoPlacer";
import AutoSync from "./modules/combat/AutoSync";
import Instakill from "./modules/combat/Instakill";
import AntiRetrap from "./modules/combat/AntiRetrap";
import KnockbackTick from "./modules/combat/KnockbackTick";
import KnockbackTickHammer from "./modules/combat/KnockbackTickHammer";
import KnockbackTickTrap from "./modules/combat/KnockbackTickTrap";
import SpikeSync from "./modules/combat/SpikeSync";
import SpikeSyncHammer from "./modules/combat/SpikeSyncHammer";
import SpikeTick from "./modules/combat/SpikeTick";
import ToolHammerSpearInsta from "./modules/combat/ToolHammerSpearInsta";
import VelocityTick from "./modules/combat/VelocityTick";
import Placer from "./modules/controls/Placer";
import PreAttack from "./modules/controls/PreAttack";
import Reloading from "./modules/controls/Reloading";
import UpdateAngle from "./modules/controls/UpdateAngle";
import UpdateAttack from "./modules/controls/UpdateAttack";
import UseAttacking from "./modules/controls/UseAttacking";
import UseDestroying from "./modules/controls/UseDestroying";
import UseFastest from "./modules/controls/UseFastest";
import UtilityHat from "./modules/controls/UtilityHat";
import AntiInsta from "./modules/defense/AntiInsta";
import Autohat from "./modules/defense/Autohat";
import DefaultAcc from "./modules/defense/DefaultAcc";
import DefaultHat from "./modules/defense/DefaultHat";
import SafeWalk from "./modules/defense/SafeWalk";
import ShameReset from "./modules/defense/ShameReset";
import AutoAccept from "./modules/utility/AutoAccept";
import AutoBuy from "./modules/utility/AutoBuy";
import AutoGrind from "./modules/utility/AutoGrind";
import Automill from "./modules/utility/Automill";
import AutoSteal from "./modules/utility/AutoSteal";
import AutoPush from "./modules/combat/AutoPush";
import ReverseInstakill from "./modules/combat/ReverseInstakill";
import BowInsta from "./modules/combat/BowInsta";
import PlacementDefense from "./modules/defense/PlacementDefense";
import settings from "../utility/Settings";
import TurretSteal from "./modules/combat/TurretSteal";
import KillChat from "./modules/utility/KillChat";
import SwordKatanaInsta from "./modules/combat/SwordKatanaInsta";
import SpikeGearInsta from "./modules/combat/SpikeGearInsta";
import TeammateSpikeTrap from "./modules/combat/TeammateSpikeTrap";
import SpikeTrap from "./modules/combat/SpikeTrap";
import TurretSync from "./modules/combat/TurretSync";
import DashMovement from "./modules/controls/DashMovement";
import KBTickHammerV2 from "./modules/combat/KBTickHammerV2";

interface IStore {
    readonly utility: Map<number, boolean>;
    lastUtility: number | null;
    current: number;
    best: number;
    actual: number;
    last: number;
}

type TStore = [IStore, IStore];

type TBotModuleList = [
    TempData,
    ClanJoiner,
    Movement,
]

type TModuleList = [
    AutoAccept,
    AutoBuy,

    DefaultHat,
    
    Reloading,
    DefaultAcc,
    AutoSync,
    SpikeSyncHammer,
    SpikeSync,
    SpikeTick,
    KnockbackTickTrap,
    KnockbackTickHammer,
    KBTickHammerV2,
    KnockbackTick,
    AntiRetrap,
    AutoPush,
    VelocityTick,
    SpikeTrap,
    TeammateSpikeTrap,
    TurretSync,
    ToolHammerSpearInsta,
    SwordKatanaInsta,
    BowInsta,
    Instakill,
    ReverseInstakill,
    Autobreak,
    AutoSteal,
    TurretSteal,
    SpikeGearInsta,
    UseFastest,
    UseDestroying,
    UseAttacking,
    UtilityHat,
    
    AntiInsta,
    ShameReset,
    SafeWalk,
    PlacementDefense,
    AutoPlacer,
    DashMovement,
    Placer,
    Automill,
    AutoGrind,

    PreAttack,
    Autohat,

    UpdateAttack,
    UpdateAngle,
    KillChat,
]

type TupleToObject<T extends { moduleName: string }[]> = {
    readonly [K in T[number]["moduleName"]]: Extract<T[number], { moduleName: K }>;
};

type TModules = [...TBotModuleList, ...TModuleList];
type TStaticModules = TupleToObject<TModules>;

class ModuleHandler {

    private readonly client: PlayerClient;

    readonly staticModules = {} as TStaticModules;
    private readonly botModules: TBotModuleList;
    private readonly modules: TModuleList;

    readonly store: TStore = [
        { utility: new Map, lastUtility: null, current: 0, best: 0, actual: -1, last: 0 },
        { utility: new Map, lastUtility: null, current: 0, best: 0, actual: -1, last: 0 },
    ];

    /** A ID list of bought hats and accessories */
    readonly bought = [
        new Set<number>,
        new Set<number>
    ] as const;

    readonly followTarget = new Vector(0, 0);
    readonly lookTarget = new Vector(0, 0);
    readonly endTarget = new Vector(0, 0);
    followPath = false;

    tickCount = 0;
    currentHolding: WeaponType | ItemType = WeaponType.PRIMARY;
    /** The type of weapon my player is holding */
    weapon!: WeaponType;

    /** Current type of item which is placing */
    currentType!: ItemType | null;

    /** true if myPlayer is attacking using left mouse button */
    attacking!: EAttack;
    attackingState!: EAttack;

    sentAngle!: ESentAngle;
    sentHatEquip!: boolean;
    sentAccEquip!: boolean;

    /** myPlayer is going to be instakilled, we need to heal */
    needToHeal!: boolean;

    /** true, if tried to outheal instakill */
    didAntiInsta!: boolean;

    /** true if used placement method at least once at current tick */
    placedOnce!: boolean;
    healedOnce!: boolean;
    totalPlaces!: number;
    attacked!: boolean;
    canHitEntity = false;

    /** true, if some of combat or defensive modules are active */
    moduleActive: boolean = false;
    useAngle: number | null = null;
    useWeapon: WeaponType | null = null;
    useItem: ItemType | null = null;
    forceWeapon: WeaponType | null = null;
    useHat: number | null = null;
    forceHat: number | null = null;
    shouldEquipSoldier = false;
    useAcc: number | null = null;
    previousWeapon: WeaponType | null = null;

    /** Current mouse angle, including lock rotation */
    currentAngle = 0;
    move_dir: number | null = null;
    reverse_move_dir: number | null = null;
    moveTo: number | null | "disable" = "disable";
    prevMoveTo: number | null | "disable" = "disable";

    /** true, if player is autoattacking */
    autoattack = false;
    shouldAttack = false;

    public readonly mouse = {

        /** An angle that was sent to the server */
        sentAngle: 0,
    }

    readonly placeAngles: [Exclude<ItemType, ItemType.FOOD> | null, number[]] = [null, []];


    constructor(client: PlayerClient) {
        this.client = client;

        this.staticModules = {
            tempData: new TempData(client),
            movement: new Movement(client),
            clanJoiner: new ClanJoiner(client),

            autoAccept: new AutoAccept(client),
            autoBuy: new AutoBuy(client),

            defaultHat: new DefaultHat(client),
            
            reloading: new Reloading(client),
            defaultAcc: new DefaultAcc(client),
            autoSync: new AutoSync(client),
            spikeSyncHammer: new SpikeSyncHammer(client),
            spikeSync: new SpikeSync(client),
            spikeTick: new SpikeTick(client),
            knockbackTickTrap: new KnockbackTickTrap(client),
            knockbackTick: new KnockbackTick(client),
            knockbackTickHammer: new KnockbackTickHammer(client),
            kbTickHammerV2: new KBTickHammerV2(client),
            antiRetrap: new AntiRetrap(client),
            autoPush: new AutoPush(client),
            velocityTick: new VelocityTick(client),
            spikeTrap: new SpikeTrap(client),
            teammateSpikeTrap: new TeammateSpikeTrap(client),
            turretSync: new TurretSync(client),
            toolHammerSpearInsta: new ToolHammerSpearInsta(client),
            swordKatanaInsta: new SwordKatanaInsta(client),
            bowInsta: new BowInsta(client),
            instakill: new Instakill(client),
            reverseInstakill: new ReverseInstakill(client),
            autoBreak: new Autobreak(client),
            autoSteal: new AutoSteal(client),
            turretSteal: new TurretSteal(client),
            spikeGearInsta: new SpikeGearInsta(client),
            useFastest: new UseFastest(client),
            useDestroying: new UseDestroying(client),
            useAttacking: new UseAttacking(client),
            utilityHat: new UtilityHat(client),
            
            antiInsta: new AntiInsta(client),
            shameReset: new ShameReset(client),
            safeWalk: new SafeWalk(client),
            placementDefense: new PlacementDefense(client),
            dashMovement: new DashMovement(client),
            autoPlacer: new AutoPlacer(client),
            placer: new Placer(client),
            autoMill: new Automill(client),
            autoGrind: new AutoGrind(client),

            preAttack: new PreAttack(client),
            autoHat: new Autohat(client),
        
            updateAttack: new UpdateAttack(client),
            updateAngle: new UpdateAngle(client),
            killChat: new KillChat(client),
        };

        this.botModules = [
            this.staticModules.tempData,
            this.staticModules.clanJoiner,
            this.staticModules.movement,
        ];

        this.modules = [
            this.staticModules.autoAccept,
            this.staticModules.autoBuy,

            this.staticModules.defaultHat,
            
            this.staticModules.reloading,
            this.staticModules.defaultAcc,
            this.staticModules.autoSync,
            this.staticModules.spikeSyncHammer,
            this.staticModules.spikeSync,
            this.staticModules.spikeTick,
            this.staticModules.knockbackTickTrap,
            this.staticModules.knockbackTickHammer,
            this.staticModules.kbTickHammerV2,
            this.staticModules.knockbackTick,
            this.staticModules.antiRetrap,
            this.staticModules.autoPush,
            this.staticModules.velocityTick,
            this.staticModules.spikeTrap,
            this.staticModules.teammateSpikeTrap,
            this.staticModules.turretSync,
            this.staticModules.toolHammerSpearInsta,
            this.staticModules.swordKatanaInsta,
            this.staticModules.bowInsta,
            this.staticModules.instakill,
            this.staticModules.reverseInstakill,
            this.staticModules.autoBreak,
            this.staticModules.autoSteal,
            this.staticModules.turretSteal,
            this.staticModules.spikeGearInsta,
            this.staticModules.useFastest,
            this.staticModules.useDestroying,
            this.staticModules.useAttacking,
            this.staticModules.utilityHat,
            
            this.staticModules.antiInsta,
            this.staticModules.shameReset,
            this.staticModules.safeWalk,
            this.staticModules.placementDefense,
            this.staticModules.autoPlacer,
            this.staticModules.dashMovement,
            this.staticModules.placer,
            this.staticModules.autoMill,
            this.staticModules.autoGrind,
            
            this.staticModules.preAttack,
            this.staticModules.autoHat,

            this.staticModules.updateAttack,
            this.staticModules.updateAngle,
            this.staticModules.killChat,
        ];
        this.reset();
    }

    private movementReset() {
        this.currentHolding = WeaponType.PRIMARY;
        this.weapon = WeaponType.PRIMARY;
        this.currentType = null;
        this.attacking = EAttack.DISABLED;
        this.attackingState = EAttack.DISABLED;
        this.move_dir = null;
        this.reverse_move_dir = null;
    }
    
    reset(): void {
        const { isOwner, clients } = this.client;
        this.movementReset();
        this.getHatStore().utility.clear();
        this.getAccStore().utility.clear();
        this.sentAngle = ESentAngle.NONE;
        this.sentHatEquip = false;
        this.sentAccEquip = false;
        this.needToHeal = false;
        this.didAntiInsta = false;
        this.placedOnce = false;
        this.healedOnce = false;
        this.totalPlaces = 0;
        this.attacked = false;
        this.canHitEntity = false;
        this.autoattack = false;

        for (const module of this.modules) {
            if ("reset" in module) {
                module.reset();
            }
        }

        if (isOwner) {
            for (const client of clients) {
                client.ModuleHandler.movementReset();
                client.ModuleHandler.toggleAutoattack(false);
            }
        }
    }

    get holdingWeapon(): boolean {
        return this.currentHolding <= WeaponType.SECONDARY;
    }

    get isMoving() {
        return this.move_dir !== null;
    }

    setForceHat(hat: number | null) {
        if (this.forceHat !== null && hat !== null) return;
        this.forceHat = hat;
    }

    getHatStore() {
        return this.store[EStoreType.HAT];
    }

    getAccStore() {
        return this.store[EStoreType.ACCESSORY];
    }

    setFollowTarget(x: number, y: number) {
        this.followTarget.setXY(x, y);
    }

    setLookTarget(x: number, y: number) {
        this.lookTarget.setXY(x, y);
    }

    private updateSentAngle(priority: ESentAngle) {
        if (this.sentAngle >= priority) return;
        this.sentAngle = priority;
    }

    upgradeItem(id: number, isItem = false) {
        if (isItem) {
            id += 16;
        }
        
        this.client.PacketManager.upgradeItem(id);
        this.client.myPlayer.upgradeItem(id);

        if (DataHandler.isWeapon(id)) {
            const type = DataHandler.getWeapon(id).type;
            const { reloading } = this.staticModules;
            reloading.updateMaxReload(type);
        }
    }

    startMovement(angle: number | null = this.move_dir, ignore = false) {
        if (!ignore) {
            this.move_dir = angle;
            this.reverse_move_dir = angle === null ? null : reverseAngle(angle);
            if (this.moveTo !== "disable") return;
        }

        const { EnemyManager } = this.client;
        const { safeWalk } = this.staticModules;
        if (
            safeWalk.willGetHit(angle, 45, EnemyManager.nearestCollider) ||
            safeWalk.willGetHit(angle, 45, EnemyManager.secondNearestCollider)
        ) return false;

        this.client.PacketManager.move(angle);
        return true;
    }

    stopMovement() {
        this.client.PacketManager.resetMoveDir();
    }

    startPlacement(type: ItemType | null) {
        this.currentType = type;
    }

    canBuy(type: EStoreType, id: number): boolean {
        if (id === -1) return false;
        const store = DataHandler.getStore(type);
        // @ts-ignore
        const price = store[id].price;
        const bought = this.bought[type];
        return bought.has(id) || this.client.myPlayer.tempGold >= price && this.client.myPlayer.isSandbox;
    }

    /** Buys a hat or accessory and returns true if it was successful */
    buy(type: EStoreType, id: number, force = false): boolean {
        const store = DataHandler.getStore(type);
        const { isOwner, clients, myPlayer, PacketManager } = this.client;
        if (!myPlayer.inGame) return false;

        if (force) {
            if (isOwner) {
                for (const client of clients) {
                    client.ModuleHandler.buy(type, id, force);
                }
            }
        }

        // @ts-ignore
        const price = store[id].price;
        const bought = this.bought[type];

        if (price === 0) {
            bought.add(id);
            return true;
        }
        
        if (!bought.has(id) && myPlayer.tempGold >= price && (myPlayer.isSandbox || force)) {
            PacketManager.buy(type, id);
            myPlayer.tempGold -= price;
            return false;
        }
        return bought.has(id);
    }

    hasStoreItem(type: EStoreType, id: number) {
        const store = this.bought[type];
        return store.has(id);
    }
    
    /** Buys and equips a hat or accessory */
    equip(type: EStoreType, id: number, force = false, toggle = false): boolean {
        const store = this.store[type];
        const { myPlayer, PacketManager, EnemyManager, isOwner, clients } = this.client;
        if (toggle && store.last === id && id !== 0) {
            id = 0;
        }
        if (!myPlayer.inGame || !this.buy(type, id, force)/*  || store.last === id */) return false;
        if (store.last === id && myPlayer.storeData[type] === id) return false;
        // TODO: Improve the way store handles hat equipment between forced and automatic type
        // if (!force) {
        //     if (store.current === id) return false;
        //     store.current = id;
        // }

        store.last = id;
        PacketManager.equip(type, id);

        if (type === EStoreType.HAT) {
            this.sentHatEquip = true;
        } else {
            this.sentAccEquip = true;
        }

        if (force) {
            store.actual = id;
            if (isOwner) {
                for (const client of clients) {
                    client.ModuleHandler.staticModules.tempData.setStore(type, id);
                }
            }
        }

        const nearest = EnemyManager.nearestTurretEntity;
        const reloading = this.staticModules.reloading;
        if (nearest !== null && reloading.isReloaded(ReloadType.TURRET) && type === EStoreType.HAT && id === EHat.TURRET_GEAR) {
            reloading.resetByType(ReloadType.TURRET);
        }
        return true;
    }

    updateAngle(angle: number, force = false) {
        if (!force && angle === this.mouse.sentAngle) return;
        this.mouse.sentAngle = angle;
        this.updateSentAngle(ESentAngle.HIGH);
        this.client.PacketManager.updateAngle(angle);
    }

    selectItem(type: ItemType) {
        const { myPlayer } = this.client;
        const item = myPlayer.getItemByType(type)!;
        if (myPlayer.currentItem !== -1) {
            myPlayer.currentItem = -1;
            this.whichWeapon();
        }
        this.client.PacketManager.selectItemByID(item, false);
        this.currentHolding = type;
    }

    attack(angle: number | null, priority = ESentAngle.MEDIUM) {
        if (angle !== null) {
            this.mouse.sentAngle = angle;
        }
        this.updateSentAngle(priority);
        this.client.PacketManager.attack(angle);

        if (this.holdingWeapon) {
            this.attacked = true;
        }
    }

    stopAttack() {
        this.client.PacketManager.stopAttack();
    }

    toggleAutoattack(state = !this.autoattack) {
        // const { PacketManager } = this.client;
        // if (this.attackingState !== EAttack.DISABLED) return;
        this.autoattack = state;
        this.attacking = state ? EAttack.ATTACK : EAttack.DISABLED;
        // PacketManager.autoAttack();
    }

    whichWeapon(type: WeaponType = this.weapon) {
        const weapon = this.client.myPlayer.getItemByType(type);
        if (weapon === null) return;

        this.currentHolding = type;
        this.weapon = type;
        this.client.PacketManager.selectItemByID(weapon, true);
    }

    place(type: ItemType, angle = this.currentAngle) {
        this.totalPlaces += 1;
        this.selectItem(type);
        this.attack(angle, ESentAngle.LOW);
        this.whichWeapon();
    }

    heal() {
        this.selectItem(ItemType.FOOD);
        this.attack(null, ESentAngle.LOW);
        this.whichWeapon();
    }

    circleOffset = 0;
    targetSpeed = 65;
    
    activeModule: string | null = null;
    postTick() {
        if (settings._circleRotation && this.move_dir === null) {
            const rotationSpeed = this.targetSpeed / settings._circleRadius;
            this.circleOffset = (this.circleOffset + rotationSpeed) % (Math.PI * 2);
        }

        const { isOwner } = this.client;

        this.placeAngles[0] = null;
        this.placeAngles[1].length = 0;
        this.activeModule = null;
        this.tickCount += 1;
        this.sentAngle = ESentAngle.NONE;
        this.sentHatEquip = false;
        this.sentAccEquip = false;
        this.didAntiInsta = false;
        this.placedOnce = false;
        this.healedOnce = false;
        this.totalPlaces = 0;
        this.attacked = false;
        this.canHitEntity = false;
        this.moduleActive = false;
        this.useWeapon = null;
        this.useItem = null;
        this.forceWeapon = null;
        this.useHat = null;
        this.forceHat = null;
        this.shouldEquipSoldier = false;
        this.useAcc = null;
        this.useAngle = null;
        this.shouldAttack = false;
        this.prevMoveTo = this.moveTo;
        this.moveTo = "disable";

        if (!isOwner) {
            for (const botModule of this.botModules) {
                botModule.postTick();
            }
        }

        for (const module of this.modules) {
            const prevg = this.moduleActive;
            module.postTick();
            if (!prevg && this.moduleActive) {
                this.activeModule = module.moduleName;
            }
        }
        this.attackingState = this.attacking;
        if (isOwner) {
            this.client.InputHandler.postTick();
            GameUI.updateFastQ(this.didAntiInsta);
            GameUI.updatePlaces(this.totalPlaces);
            GameUI.updateActiveModule(this.activeModule + `, ${this.tickCount}`);
            GameUI.updateEquipHat(`${this.store[EStoreType.HAT].last},  ${this.shouldEquipSoldier}`);
        }
    }
}

export default ModuleHandler;