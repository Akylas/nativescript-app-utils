export namespace AppUtilsAndroid {
    export function listenForWindowInsets(onWindowInsetsChange: (result: [number, number, number, number, number]) => void) {}
    export function prepareWindow(window) {}

    export function getDimensionFromInt(context: any, intToGet: number) {}
    export function getColorFromInt(context: any, intToGet: number) {}
    export function getColorFromName(context: any, intToGet: number) {}

    export function restartApp() {}
    export function prepareActivity(activity: any) {}
    export function applyDayNight(activity: any, applyDynamicColors: boolean) {}
    export function applyDynamicColors(activity: any) {}
}

export function setWorkerContextValue(key, value) {
    NWorkerContext.setValue(key, value);
}
export function getWorkerContextValue(key) {
    return NWorkerContext.getValue(key);
}

export function getISO3Language(lang) {
    return NSLocale.alloc().initWithLocaleIdentifier(lang).ISO639_2LanguageCode();
}
