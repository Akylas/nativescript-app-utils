import { setWorkerContextValue } from '@akylas/nativescript-app-utils';
import { Observable } from '@nativescript/core';
import { time } from '@nativescript/core/profiling';
import type { BaseWorker, WorkerEventType, WorkerPostEvent } from './BaseWorker';
import Queue from './queue';

export default abstract class BaseWorkerHandler<T extends BaseWorker> extends Observable {
    constructor(private createWorker: () => Worker) {
        super();
    }
    worker: T;
    messagePromises: { [key: string]: { resolve: Function; reject: Function; timeoutTimer: number }[] } = {};
    abstract onWorkerEvent(eventData);
    async onWorkerMessage(event: {
        data: {
            id?: number;
            type: WorkerEventType;
            messageData?: string;
            nativeDatas?: { [k: string]: any };
        };
    }) {
        // DEV_LOG && console.log('onWorkerMessage', event);
        const data = event.data;
        const id = data.id;
        try {
            let messageData = data.messageData;
            if (typeof messageData === 'string') {
                try {
                    messageData = JSON.parse(messageData);
                } catch (error) {}
            }
            // DEV_LOG && console.error(TAG, 'onWorkerMessage', id, data.type, id && this.messagePromises.hasOwnProperty(id), Object.keys(this.messagePromises), messageData);
            if (id && this.messagePromises.hasOwnProperty(id)) {
                this.messagePromises[id].forEach(function (executor) {
                    executor.timeoutTimer && clearTimeout(executor.timeoutTimer);
                    executor.resolve(messageData);
                });
                delete this.messagePromises[id];
            }
            const eventData = messageData as any;
            switch (data.type) {
                case 'event':
                    await this.onWorkerEvent(eventData);
                    break;
                case 'error':
                    this.handleWorkerError(eventData.error);
                    // showError(CustomError.fromObject(eventData.error));
                    break;

                case 'started':
                    this.notify({ eventName: 'worker_started' });
                    break;
                case 'terminate':
                    // console.info('worker stopped');
                    this.worker = null;
                    break;
            }
        } catch (error) {
            console.error(error, error.stack);
            this.handleError(error);
        }
    }
    abstract handleError(error);
    abstract handleWorkerError(error);
    queue = new Queue();
    async internalSendMessageToWorker(data: WorkerPostEvent) {
        return this.queue.add(async () => {
            // DEV_LOG && console.warn('internalSendMessageToWorker', data.type, !!this.worker);
            if (!this.worker) {
                await new Promise<void>((resolve, reject) => {
                    this.once('worker_started', () => {
                        if (timeoutTimer) {
                            clearTimeout(timeoutTimer);
                        }
                        resolve();
                    });
                    const worker = (this.worker = this.createWorker() as any);
                    worker.onmessage = this.onWorkerMessage.bind(this);
                    worker.onerror = (e) => {
                        reject(e);
                        this.worker = null;
                    };
                    const timeoutTimer = setTimeout(() => {
                        reject(new Error('failed_to_start_worker'));
                    }, 2000);
                });
            }
            this.worker.postMessage(data);
        });
    }
    async sendMessageToWorker<T = any>(type: string, messageData?, id?: number, error?, isResponse = false, timeout = 0, nativeData?): Promise<T> {
        // DEV_LOG && console.info('Sync', 'sendMessageToWorker', type, id, timeout, isResponse, !isResponse && (id || timeout), messageData, nativeData, this.worker);
        if (!isResponse && (id || timeout)) {
            return new Promise(async (resolve, reject) => {
                // const id = Date.now().valueOf();
                id = id || time();
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
                const keys = Object.keys(nativeData);
                const nativeDataKeysPrefix = Date.now() + '$$$';
                keys.forEach((k) => {
                    setWorkerContextValue(nativeDataKeysPrefix + k, nativeData[k]._native || nativeData[k]);
                });
                const data = {
                    error: !!error ? JSON.stringify(error.toJSON() ? error.toJSON() : { message: error.toString(), ...error }) : undefined,
                    id,
                    nativeDataKeysPrefix,
                    messageData: !!messageData ? JSON.stringify(messageData) : undefined,
                    nativeData: keys.map((k) => nativeDataKeysPrefix + k),
                    type
                };
                // DEV_LOG && console.info('Sync', 'postMessage', JSON.stringify(data));
                try {
                    await this.internalSendMessageToWorker(data);
                } catch (error) {
                    reject(error);
                }
            });
        } else {
            // DEV_LOG && console.info('Sync', 'postMessage', 'test');
            const keys = Object.keys(nativeData);
            const nativeDataKeysPrefix = Date.now() + '$$$';
            keys.forEach((k) => {
                setWorkerContextValue(nativeDataKeysPrefix + k, nativeData[k]._native || nativeData[k]);
            });
            const data = {
                error: !!error ? JSON.stringify({ message: error.toString(), ...error }) : undefined,
                id,
                nativeDataKeysPrefix,
                messageData: !!messageData ? JSON.stringify(messageData) : undefined,
                nativeData: keys.map((k) => nativeDataKeysPrefix + k),
                type
            };
            // DEV_LOG && console.info('Sync', 'postMessage', JSON.stringify(data));
            await this.internalSendMessageToWorker(data);
            return null;
        }
    }
}

class OneTimeWorkerHandler<T extends BaseWorker> extends BaseWorkerHandler<T> {
    _onWorkerEvent: (eventData: any) => void;
    _handleError: (error: any) => void;
    _handleWorkerError: (error: any) => void;
    constructor({ onCreate, handleError, onWorkerEvent, handleWorkerError }: { onCreate: () => Worker; handleError?; onWorkerEvent?; handleWorkerError? }) {
        super(onCreate);
        this.handleError = handleError;
        this._handleWorkerError = handleWorkerError;
        this._onWorkerEvent = onWorkerEvent;
        this._handleError = handleError;
    }
    onWorkerEvent(eventData: any) {
        this._onWorkerEvent?.(eventData);
    }
    handleError(error: any) {
        this._handleError?.(error);
    }
    handleWorkerError(error: any) {
        this._handleWorkerError?.(error);
    }
}

export function createOneTimeWorkerHandler({ onCreate, handleError, onWorkerEvent, handleWorkerError }: { onCreate: () => Worker; handleError?; onWorkerEvent?; handleWorkerError? }) {
    return new OneTimeWorkerHandler({ onCreate, handleError, onWorkerEvent, handleWorkerError });
}
