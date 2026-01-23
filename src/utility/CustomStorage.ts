/** Used to get, set and delete values from localStorage */
export default class CustomStorage {
    static get<T>(key: string): T | null {
        const value = window.localStorage.getItem(key);
        return value === null ? null : JSON.parse(value);
    }

    static set(key: string, value: unknown, stringify = true) {
        const data = stringify ? JSON.stringify(value) : value;
        window.localStorage.setItem(key, data as string);
    }

    static delete(key: string) {
        const has = window.localStorage.hasOwnProperty(key) && key in window.localStorage;
        window.localStorage.removeItem(key);
        return has;
    }
}