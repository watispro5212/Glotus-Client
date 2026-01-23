import type PlayerClient from "../PlayerClient";
import UI from "../UI/UI";
import settings from "../utility/Settings";

export default class StatsManager {
    private readonly client: PlayerClient;

    kills = 0;
    _totalKills = 0;
    _globalKills = 0;
    _deaths = 0;

    _autoSyncTimes = 0;
    _velocityTickTimes = 0;
    _spikeSyncHammerTimes = 0;
    _spikeSyncTimes = 0;
    _spikeTickTimes = 0;
    _knockbackTickTrapTimes = 0;
    _knockbackTickHammerTimes = 0;
    _knockbackTickTimes = 0;
    
    constructor(client: PlayerClient) {
        this.client = client;
    }

    init() {
        this.totalKills = settings._totalKills;
        this.globalKills = settings._globalKills;
        this.deaths = settings._deaths;
        this.autoSyncTimes = settings._autoSyncTimes;
        this.velocityTickTimes = settings._velocityTickTimes;
        this.spikeSyncHammerTimes = settings._spikeSyncHammerTimes;
        this.spikeSyncTimes = settings._spikeSyncTimes;
        this.spikeTickTimes = settings._spikeTickTimes;
        this.knockbackTickTrapTimes = settings._knockbackTickTrapTimes;
        this.knockbackTickHammerTimes = settings._knockbackTickHammerTimes;
        this.knockbackTickTimes = settings._knockbackTickTimes;
    }

    get totalKills() { return this._totalKills }
    get globalKills() { return this._globalKills }
    get deaths() { return this._deaths }

    get autoSyncTimes() { return this._autoSyncTimes }
    get velocityTickTimes() { return this._velocityTickTimes }
    get spikeSyncHammerTimes() { return this._spikeSyncHammerTimes }
    get spikeSyncTimes() { return this._spikeSyncTimes }
    get spikeTickTimes() { return this._spikeTickTimes }
    get knockbackTickTrapTimes() { return this._knockbackTickTrapTimes }
    get knockbackTickHammerTimes() { return this._knockbackTickHammerTimes }
    get knockbackTickTimes() { return this._knockbackTickTimes }

    set totalKills(value: number) {
        this._totalKills += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_totalKills", this._totalKills);
    }

    set globalKills(value: number) {
        this._globalKills += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_globalKills", this._globalKills);
    }

    set deaths(value: number) {
        this._deaths += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_deaths", this._deaths);
    }

    set autoSyncTimes(value: number) {
        this._autoSyncTimes += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_autoSyncTimes", this._autoSyncTimes);
    }

    set velocityTickTimes(value: number) {
        this._velocityTickTimes += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_velocityTickTimes", this._velocityTickTimes);
    }

    set spikeSyncHammerTimes(value: number) {
        this._spikeSyncHammerTimes += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_spikeSyncHammerTimes", this._spikeSyncHammerTimes);
    }

    set spikeSyncTimes(value: number) {
        this._spikeSyncTimes += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_spikeSyncTimes", this._spikeSyncTimes);
    }

    set spikeTickTimes(value: number) {
        this._spikeTickTimes += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_spikeTickTimes", this._spikeTickTimes);
    }

    set knockbackTickTrapTimes(value: number) {
        this._knockbackTickTrapTimes += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_knockbackTickTrapTimes", this._knockbackTickTrapTimes);
    }

    set knockbackTickHammerTimes(value: number) {
        this._knockbackTickHammerTimes += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_knockbackTickHammerTimes", this._knockbackTickHammerTimes);
    }

    set knockbackTickTimes(value: number) {
        this._knockbackTickTimes += value;
        if (!this.client.isOwner) return;
        UI.updateStats("_knockbackTickTimes", this._knockbackTickTimes);
    }

}