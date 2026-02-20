import { createOneTimeWorkerHandler } from './BaseWorkerHandler';

export async function createAndWaitForWorkerMessage<T = any>(onCreate: () => Worker, type: string, messageData) {
    const handler = createOneTimeWorkerHandler({ onCreate });
    return handler.sendMessageToWorker<T>(type, messageData, Date.now());
}
