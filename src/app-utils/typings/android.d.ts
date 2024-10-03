/* eslint-disable @typescript-eslint/unified-signatures */
declare namespace com {
    export namespace nativescript {
        export namespace apputils {
            export namespace WorkersContext {
                export class Companion {
                    public static getValue(key): any;
                    public static setValue(key: string, value);
                }
            }
            export namespace Utils {
                export class WindowInsetsCallback extends java.lang.Object {
                    public constructor(implementation: { onWindowInsetsChange(result: number[]): void });
                    public constructor();
                    public onWindowInsetsChange(result: number[]): void;
                }
                export class Companion {
                    static prepareActivity(arg0: androidx.appcompat.app.AppCompatActivity);
                    static prepareWindow(arg0: android.view.Window);
                    static applyDayNight(context: android.content.Context, applyDynamicColors: boolean);
                    static applyDynamicColors(context: android.content.Context);
                    static getDimensionFromInt(context: android.content.Context, intToGet): number;
                    static getColorFromInt(context: android.content.Context, intToGet): number;
                    static getColorFromName(context: android.content.Context, intToGet): number;
                    static restartApp(context: android.content.Context, activity: android.app.Activity);
                    static getSystemLocale(): java.util.Locale;
                    static getRootWindowInsets(view: android.view.View): number[];
                    static listenForWindowInsetsChange(view: android.view.View, callback: WindowInsetsCallback);
                }
            }
        }
    }
}
