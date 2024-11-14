import { Application, Device, ImageSource, Utils, knownFolders, path } from '@nativescript/core';
import { Content, Options } from '.';

export * from './index.common';

let numberOfImagesCreated = 0;
const sdkVersionInt = parseInt(Device.sdkVersion, 10);
const EXTRA_STREAM = 'android.intent.extra.STREAM';
const ACTION_SEND = 'android.intent.action.SEND';
const ACTION_SEND_MULTIPLE = 'android.intent.action.SEND_MULTIPLE';
export async function share(content: Content, options: Options = {}) {
    if (content == null) {
        throw new Error('missing_content');
    }
    const Intent = android.content.Intent;

    let mimetype = options.mimetype;

    const intent = new Intent(ACTION_SEND);

    const currentActivity: android.app.Activity = Application.android.foregroundActivity || Application.android.startActivity;
    const context = Utils.android.getApplicationContext();

    const uris = [];

    async function addImage(image) {
        if (!mimetype) {
            mimetype = 'image/jpeg';
        }
        const imageFileName = 'share_image_' + numberOfImagesCreated++ + '.jpg';
        const filePath = path.join(knownFolders.temp().path, imageFileName);
        await image.saveToFileAsync(filePath, 'jpg');
        const newFile = new java.io.File(filePath);
        let shareableFileUri;
        if (sdkVersionInt >= 21) {
            shareableFileUri = androidx.core.content.FileProvider.getUriForFile(currentActivity, Application.android.nativeApp.getPackageName() + '.provider', newFile);
        } else {
            shareableFileUri = android.net.Uri.fromFile(newFile);
        }
        uris.push(shareableFileUri);
    }

    function addFile(file) {
        const newFile = new java.io.File(file);
        let shareableFileUri;
        if (sdkVersionInt >= 21) {
            shareableFileUri = androidx.core.content.FileProvider.getUriForFile(currentActivity, Application.android.nativeApp.getPackageName() + '.provider', newFile);
        } else {
            shareableFileUri = android.net.Uri.fromFile(newFile);
        }
        if (!mimetype) {
            // try to guess the file mimetype
            const guessedMimetype = com.nativescript.apputils.Utils.Companion.guessMimeType(context, shareableFileUri);
            if (guessedMimetype) {
                mimetype = guessedMimetype;
            }
        }
        uris.push(shareableFileUri);
    }

    if (content.image) {
        await addImage(content.image);
    }
    if (content.images) {
        for (let index = 0; index < content.images.length; index++) {
            await addImage(content.images[index]);
        }
    }
    if (content.file) {
        addFile(content.file);
    }
    if (content.files) {
        for (let index = 0; index < content.files.length; index++) {
            addFile(content.files[index]);
        }
    }

    if (content.title) {
        if (!mimetype) {
            mimetype = 'text/plain';
        }
        intent.putExtra(Intent.EXTRA_SUBJECT, content.title);
    }

    if (content.message) {
        if (!mimetype) {
            mimetype = 'text/plain';
        }
        intent.putExtra(Intent.EXTRA_TEXT, content.message);
    }
    if (uris.length === 1) {
        intent.putExtra(EXTRA_STREAM, uris[0]);
    } else if (uris.length > 1) {
        const arrayList = new java.util.ArrayList(uris.length);
        uris.forEach((uri) => arrayList.add(uri));
        intent.setAction(ACTION_SEND_MULTIPLE);
        intent.putExtra(EXTRA_STREAM, arrayList);
    }
    intent.setTypeAndNormalize(mimetype || '*/*');

    const chooser = Intent.createChooser(intent, options.dialogTitle);
    chooser.addCategory(Intent.CATEGORY_DEFAULT);

    if (currentActivity !== null) {
        currentActivity.startActivity(chooser);
    } else {
        Utils.android.getApplicationContext().startActivity(chooser);
    }
    return true;
}
