export * from './index.common';

const NWorkerContext = com.nativescript.apputils.WorkersContext.Companion;

export function setWorkerContextValue(key, value) {
    NWorkerContext.setValue(key, value);
}
export function getWorkerContextValue(key) {
    return NWorkerContext.getValue(key);
}
