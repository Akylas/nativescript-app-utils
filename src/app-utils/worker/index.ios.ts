export * from './index.common';

export function setWorkerContextValue(key, value) {
    NWorkerContext.setValue(key, value);
}
export function getWorkerContextValue(key) {
    return NWorkerContext.getValue(key);
}
