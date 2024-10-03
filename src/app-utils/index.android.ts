import { Application, ImageSource, Utils } from '@nativescript/core';

function functionCallbackPromise<T>(onCallback: (calback: com.nativescript.apputils.FunctionCallback) => void, transformer = (v) => v, errorHandler = (e) => e) {
    return new Promise<T>((resolve, reject) => {
        const callback = new com.nativescript.apputils.FunctionCallback({
            onResult(e, result) {
                if (e) {
                    reject(errorHandler(e));
                } else {
                    try {
                        resolve(transformer(result));
                    } catch (error) {
                        reject(error);
                    } finally {
                    }
                }
            }
        });
        onCallback(callback);
    });
}

const NWorkerContext = com.nativescript.apputils.WorkersContext.Companion;
const NUtils = com.nativescript.apputils.Utils;
const UtilsCompanion = NUtils.Companion;
export namespace AppUtilsAndroid {
    export function listenForWindowInsets(onWindowInsetsChange: (result: [number, number, number, number, number]) => void) {
        const rootView = Application.getRootView();
        if (rootView) {
            UtilsCompanion.listenForWindowInsetsChange(
                rootView.nativeViewProtected as android.view.View,
                new NUtils.WindowInsetsCallback({
                    onWindowInsetsChange
                })
            );
        }
    }
    export function prepareWindow(window: android.view.Window) {
        UtilsCompanion.prepareWindow(window);
    }
    export function getDimensionFromInt(context: android.content.Context, intToGet: number) {
        return UtilsCompanion.getDimensionFromInt(context, intToGet);
    }
    export function getColorFromInt(context: android.content.Context, intToGet: number) {
        return UtilsCompanion.getColorFromInt(context, intToGet);
    }
    export function getColorFromName(context: android.content.Context, name: string) {
        return UtilsCompanion.getColorFromName(context, name);
    }
    export function prepareActivity(activity: androidx.appcompat.app.AppCompatActivity) {
        return UtilsCompanion.prepareActivity(activity);
    }
    export function applyDayNight(activity: androidx.appcompat.app.AppCompatActivity, applyDynamicColors: boolean) {
        return UtilsCompanion.applyDayNight(activity, applyDynamicColors);
    }
    export function applyDynamicColors(activity: androidx.appcompat.app.AppCompatActivity) {
        return UtilsCompanion.applyDynamicColors(activity);
    }
}

export function restartApp() {
    return UtilsCompanion.restartApp(Utils.android.getApplicationContext(), Application.android.startActivity);
}
export function setWorkerContextValue(key, value) {
    NWorkerContext.setValue(key, value);
}
export function getWorkerContextValue(key) {
    return NWorkerContext.getValue(key);
}
export function getISO3Language(lang) {
    const locale = java.util.Locale.forLanguageTag(lang);
    return locale.getISO3Language();
}

export function loadImageSync(imagePath, loadOptions: { width?; height?; resizeThreshold?; sourceWidth?; sourceHeight?; jpegQuality? } = {}) {
    loadOptions.resizeThreshold ??= 4500;
    return new ImageSource(com.nativescript.apputils.ImageUtils.Companion.readBitmapFromFileSync(Utils.android.getApplicationContext(), imagePath, JSON.stringify(loadOptions)));
}
export function loadImage(imagePath, loadOptions: { width?; height?; resizeThreshold?; sourceWidth?; sourceHeight?; jpegQuality? } = {}) {
    loadOptions.resizeThreshold ??= 4500;
    return functionCallbackPromise<any[]>(
        (callback) => {
            com.nativescript.apputils.ImageUtils.Companion.readBitmapFromFile(Utils.android.getApplicationContext(), imagePath, callback, JSON.stringify(loadOptions));
        },
        (e) => new ImageSource(e)
    );
}
