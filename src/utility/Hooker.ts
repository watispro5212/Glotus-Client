const Hooker = new class Hooker {
    createRecursiveHook(
        target: any,
        prop: string | number,
        callback: (that: any, value: any) => boolean
    ) {
        let newValue = target[prop];
        (function recursiveHook() {
            Object.defineProperty(target, prop, {
                set(value) {
                    delete target[prop];
                    this[prop] = value;
                    newValue = value;
                    if (callback(this, value)) return;
                    recursiveHook();
                },
                get() {
                    return newValue;
                },
                configurable: true
            })
        })();
    }

    createHook(
        target: any,
        prop: string | number,
        callback: (that: any, value: any, symbol: any) => void
    ) {
        const symbol = Symbol(prop);
        Object.defineProperty(target, prop, {
            get() {
                return this[symbol];
            },
            set(value) {
                callback(this, value, symbol);
            },
            configurable: true
        })
    }

    linker(value: any) {
        const hook = [value] as [any];
        hook.valueOf = () => hook[0];
        return hook;
    }
}

export const blockProperty = (target: any, key: string) => {
    const value = target[key];
    Object.defineProperty(target, key, {
        set(){},
        get(){return value},
        configurable: true,
    })
}

export default Hooker;