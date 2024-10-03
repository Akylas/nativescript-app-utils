import { ImageSource } from '@nativescript/core';

@NativeClass
class NCompletionDelegateImpl extends NSObject implements NCompletionDelegate {
    static ObjCProtocols = [NCompletionDelegate];
    resolve;
    reject;
    progress;
    shouldParse;
    onCompleteError(result: any, error): void {
        if (error) {
            this.reject(error);
        } else {
            if (this.shouldParse && typeof result === 'string') {
                this.resolve(result ? JSON.parse(result) : null);
            } else {
                this.resolve(result);
            }
        }
    }
    onProgress(progress: number): void {
        this.progress?.(progress);
    }

    static initWithResolveReject(resolve, reject, progress?, shouldParse = true) {
        const delegate = NCompletionDelegateImpl.new() as NCompletionDelegateImpl;
        delegate.resolve = resolve;
        delegate.reject = reject;
        delegate.onProgress = progress;
        delegate.shouldParse = shouldParse;
        return delegate;
    }
}

function functionCallbackPromise<T>(onCallback: (delegate: NCompletionDelegate) => void, transformer = (v) => v, errorHandler = (e) => e, shouldParse?, onProgress?) {
    return new Promise<T>((resolve, reject) => {
        const delegate = NCompletionDelegateImpl.initWithResolveReject(
            (result) => {
                try {
                    resolve(transformer(result));
                } catch (error) {
                    reject(error);
                } finally {
                }
            },
            (error) => {
                reject(errorHandler(error));
            },
            onProgress,
            shouldParse
        );

        onCallback(delegate);
    });
}

export namespace AppUtilsAndroid {
    export function listenForWindowInsets(onWindowInsetsChange: (result: [number, number, number, number, number]) => void) {}
    export function prepareWindow(window) {}

    export function getDimensionFromInt(context: any, intToGet: number) {}
    export function getColorFromInt(context: any, intToGet: number) {}
    export function getColorFromName(context: any, intToGet: number) {}

    export function prepareActivity(activity: any) {}
    export function applyDayNight(activity: any, applyDynamicColors: boolean) {}
    export function applyDynamicColors(activity: any) {}
}
export function restartApp() {}

export function setWorkerContextValue(key, value) {
    NWorkerContext.setValue(key, value);
}
export function getWorkerContextValue(key) {
    return NWorkerContext.getValue(key);
}

export function getISO3Language(lang) {
    return NSLocale.alloc().initWithLocaleIdentifier(lang).ISO639_2LanguageCode();
}

export function loadImageSync(imagePath, loadOptions: { width?; height?; resizeThreshold?; sourceWidth?; sourceHeight?; jpegQuality? } = {}) {
    loadOptions.resizeThreshold ??= 4500;
    return new ImageSource(ImageUtils.readImageFromFileSync(imagePath, JSON.stringify(loadOptions)));
}

export function loadImage(imagePath, loadOptions: { width?; height?; resizeThreshold?; sourceWidth?; sourceHeight?; jpegQuality? } = {}) {
    loadOptions.resizeThreshold ??= 4500;
    functionCallbackPromise(
        (delegate) => {
            ImageUtils.readImageFromFile(imagePath, delegate, JSON.stringify(loadOptions));
        },
        (e) => new ImageSource(e)
    );
}
