import { time } from '@nativescript/core/profiling';
import type { Optional } from '@nativescript/core/utils/typescript-utils';
import { getWorkerContextValue, setWorkerContextValue } from '@akylas/nativescript-app-utils';
import { EventData, Observable } from '@nativescript/core';

export type WorkerEventType = 'event' | 'error' | 'started' | 'terminate';

export interface WorkerPostOptions {
    id?: number;
    messageData?: string;
}

export type WorkerPostEvent = { type: string } & WorkerPostOptions;
export interface WorkerEvent {
    data: { messageData?: any; error?: Error; nativeData?: { [k: string]: any }; type: string; id?: number };
}
// export interface WorkerResult {}

export interface IWorker extends BaseWorker {
    onmessage: Function;
    postMessage(event: WorkerPostEvent);
}
const TAG = '[BaseWorker]';

export abstract class BaseWorker extends Observable {
    constructor(protected context) {
        super();
        context.onmessage = (event) => {
            // DEV_LOG && console.log(TAG, 'onmessage', Date.now(), event);
            if (typeof event.data.messageData === 'string') {
                try {
                    event.data.messageData = JSON.parse(event.data.messageData);
                } catch (error) {}
            }
            if (Array.isArray(event.data.nativeData)) {
                event.data.nativeData = (event.data.nativeData as string[]).reduce((acc, key) => {
                    const actualKey = key.split('$$$')[1];
                    acc[actualKey] = getWorkerContextValue(key);
                    setWorkerContextValue(key, null);
                    return acc;
                }, {});
            }
            if (typeof event.data.error === 'string') {
                try {
                    event.data.error = JSON.parse(event.data.error);
                } catch (error) {}
            }
            const handled = this.receivedMessageBase(event);
            if (!handled) {
                this.receivedMessage(event);
            }
        };
        this.postMessage({
            type: 'started'
        });
    }
    onmessage: Function;
    postMessage(event: WorkerPostEvent) {
        (global as any).postMessage(event);
    }
    abstract receivedMessage(event: WorkerEvent);

    receivedMessageBase(event: WorkerEvent) {
        const data = event.data;
        const id = data.id;
        // DEV_LOG && console.log(TAG, 'receivedMessage', data.type, id, id && this.messagePromises.hasOwnProperty(id), Object.keys(this.messagePromises), data);
        if (data.type === 'terminate') {
            this.context.close();
            return true;
        }

        if (id && this.messagePromises.hasOwnProperty(id)) {
            this.messagePromises[id].forEach(function (executor) {
                executor.timeoutTimer && clearTimeout(executor.timeoutTimer);
                const messageData = data.messageData;
                if (!!messageData?.error) {
                    executor.reject(messageData.error);
                } else {
                    executor.resolve(messageData);
                }
            });
            delete this.messagePromises[id];
            return true;
        }
        return false;
    }

    messagePromises: { [key: string]: { resolve: Function; reject: Function; timeoutTimer: number }[] } = {};
    postPromiseMessage<T = any>(type: string, messageData, id = 0, timeout = 0, nativeData?): Promise<T> {
        return new Promise((resolve, reject) => {
            id = id || time();
            // DEV_LOG && console.warn(TAG, 'postPromiseMessage', type, id, timeout, messageData);
            if (id || timeout) {
                this.messagePromises[id] = this.messagePromises[id] || [];
                let timeoutTimer;
                if (timeout > 0) {
                    timeoutTimer = setTimeout(() => {
                        // we need to try catch because the simple fact of creating a new Error actually throws.
                        // so we will get an uncaughtException
                        try {
                            reject(new Error('timeout'));
                        } catch {}
                        delete this.messagePromises[id];
                    }, timeout);
                }
                this.messagePromises[id].push({ reject, resolve, timeoutTimer });
            }
            const mData = {
                id,
                messageData: JSON.stringify(messageData),
                type
            };
            // DEV_LOG && console.log(TAG, 'postMessage', mData, this.messagePromises[id]);
            this.postMessage(mData);
        });
    }

    async stop(error?, id?) {
        this.postMessage({
            type: 'terminate'
        });
        this.context.close();
    }

    notify<T extends Optional<EventData & { error?: Error }, 'object'>>(data: T): void {
        // DEV_LOG && console.log(TAG, 'notify', data.eventName);
        //we are a fake observable
        if (data.error) {
            // Error is not really serializable so we need custom handling
            const { nativeException, ...error } = data.error as any;
            data.error = { message: data.error.toString(), stack: data.error.stack, ...data.error };
        }
        this.postMessage({
            messageData: JSON.stringify(data),
            type: 'event'
        });
    }

    async notifyAndAwait<T = any>(eventName, data) {
        return this.postPromiseMessage<T>('event', { data, eventName });
    }

    async sendError(error) {
        const { nativeException, ...realError } = error;
        this.postMessage({
            messageData: JSON.stringify({ error: { message: error.toString(), stack: error.stack, ...error } }),
            type: 'error'
        });
    }
}
