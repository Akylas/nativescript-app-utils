/* eslint-disable no-redeclare */
/* eslint-disable no-var */
declare class NWorkerContext {
    static setValue(key: string, value: any);
    static getValue(key: string);
}

declare interface NSLocale {
    ISO639_2LanguageCode();
}
declare class ImageUtils extends NSObject {
    static alloc(): ImageUtils; // inherited from NSObject

    static getAspectSafeDimensions(sourceWidth: number, sourceHeight: number, reqWidth: number, reqHeight: number): CGSize;

    static new(): ImageUtils; // inherited from NSObject

    static readImageFromFileOptions(src: string, options: NSDictionary<any, any>): UIImage;

    static readImageFromFileSync(src: string, stringOptions?: string): UIImage;
    static readImageFromFile(src: string, delegate: NCompletionDelegate, stringOptions?: string);
    static getImageSize(src: string): NSDictionary<string, any>;

    static scaleImage(image: UIImage, scaledImageSize: CGSize): UIImage;

    static toJSON(str: string): NSDictionary<any, any>;
}

interface NCompletionDelegate {
    onCompleteError(result: NSObject, error: NSError): void;

    onProgress(progress: number): void;
}
declare var NCompletionDelegate: {
    prototype: CompletionDelegate;
};
