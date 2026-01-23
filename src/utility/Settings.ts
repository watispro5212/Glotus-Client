import { EAccessory, EHat } from "../types/Store";
import UI from "../UI/UI";
import CustomStorage from "./CustomStorage";

export const defaultSettings = {
    _primary: "Digit1",
    _secondary: "Digit2",
    _food: "KeyQ",
    _wall: "Digit4",
    _spike: "KeyC",
    _windmill: "KeyV",
    _farm: "KeyT",
    _trap: "Space",
    _turret: "KeyF",
    _spawn: "KeyG",
    _up: "KeyW",
    _left: "KeyA",
    _down: "KeyS",
    _right: "KeyD",
    _autoattack: "KeyE",
    _lockrotation: "KeyX",
    _lockBotPosition: "KeyZ",
    _toggleChat: "Enter",
    _toggleShop: "ShiftLeft",
    _toggleClan: "ControlLeft",
    _toggleMenu: "Escape",
    _instakill: "KeyR",
    _biomehats: true,
    _autoemp: true,
    _antienemy: true,
    _soldierDefault: true,
    _antianimal: true,
    _antispike: true,
    _empDefense: true,
    _autoheal: true,
    _autoSync: true,
    _velocityTick: true,
    _spikeSyncHammer: true,
    _spikeSync: true,
    _spikeTick: true,
    _knockbackTickTrap: true,
    _knockbackTickHammer: true,
    _knockbackTick: true,
    _toolSpearInsta: true,
    _autoSteal: true,
    _autoPush: true,
    _turretSteal: true,
    _spikeGearInsta: true,
    _antiRetrap: true,
    _turretSync: true,
    _automill: true,
    _autoplacer: true,
    _placementDefense: true,
    _preplacer: false,
    _autoplacerRadius: 325,
    _placeAttempts: 4,
    _autobreak: true,
    _safeWalk: true,
    _dashMovement: true,
    _autoGrind: false,
    _enemyTracers: false,
    _enemyTracersColor: "#cc5151",
    _teammateTracers: false,
    _teammateTracersColor: "#8ecc51",
    _animalTracers: false,
    _animalTracersColor: "#518ccc",
    _notificationTracers: true,
    _notificationTracersColor: "#f5d951",
    _itemMarkers: true,
    _itemMarkersColor: "#84bd4b",
    _teammateMarkers: true,
    _teammateMarkersColor: "#bdb14b",
    _enemyMarkers: true,
    _enemyMarkersColor: "#ba4949",
    _weaponXPBar: true,
    _playerTurretReloadBar: true,
    _playerTurretReloadBarColor: "#cf7148",
    _weaponReloadBar: true,
    _weaponReloadBarColor: "#5155cc",
    _renderHP: true,
    _stackedDamage: true,
    _objectTurretReloadBar: false,
    _objectTurretReloadBarColor: "#66d9af",
    _itemHealthBar: false,
    _itemHealthBarColor: "#6b449e",
    _displayPlayerAngle: false,
    _weaponHitbox: false,
    _collisionHitbox: false,
    _placementHitbox: false,
    _possiblePlacement: true,
    _killMessage: true,
    _killMessageText: "Glotus Client!",
    _autospawn: false,
    _autoaccept: false,
    _texturepack: false,
    _hideHUD: false,
    _smoothRendering: 160,
    _menuTransparency: true,
    _chatLog: false,
    _followCursor: true,
    _movementRadius: 150,
    _circleFormation: false,
    _circleRotation: true,
    _circleRadius: 100,
    _storeItems: [[
        EHat.WINTER_CAP,
        EHat.FLIPPER_HAT,
        EHat.SOLDIER_HELMET,
        EHat.BULL_HELMET,
        EHat.EMP_HELMET,
        EHat.BOOSTER_HAT,
        EHat.BARBARIAN_ARMOR,
        EHat.SPIKE_GEAR,
        EHat.TURRET_GEAR,
        EHat.SAMURAI_ARMOR,
        EHat.TANK_GEAR,
        EHat.ASSASSIN_GEAR
    ], [
        EAccessory.MONKEY_TAIL,
        EAccessory.APPLE_BASKET,
        EAccessory.SAWBLADE,
        EAccessory.ANGEL_WINGS,
        EAccessory.SHADOW_WINGS,
        EAccessory.BLOOD_WINGS,
        EAccessory.CORRUPT_X_WINGS,
    ]],

    _totalKills: 0,
    _globalKills: 0,
    _deaths: 0,
    _autoSyncTimes: 0,
    _velocityTickTimes: 0,
    _spikeSyncHammerTimes: 0,
    _spikeSyncTimes: 0,
    _spikeTickTimes: 0,
    _knockbackTickTrapTimes: 0,
    _knockbackTickHammerTimes: 0,
    _knockbackTickTimes: 0,
};

export type ISettings = typeof defaultSettings;
const settings = { ...defaultSettings, ...CustomStorage.get<ISettings>("Glotus") };
for (const iterator in settings) {
    const key = iterator as keyof ISettings;
    if (!defaultSettings.hasOwnProperty(key)) {
        delete settings[key];
    }
}


export const SaveSettings = () => {
    CustomStorage.set("Glotus", settings);
}
SaveSettings();

export const resetSettings = () => {
    for (const iterator in defaultSettings) {
        const key = iterator as keyof ISettings;
        (settings as any)[key] = defaultSettings[key];
    }
    SaveSettings();
    UI.resetFrame();
}

export default settings;