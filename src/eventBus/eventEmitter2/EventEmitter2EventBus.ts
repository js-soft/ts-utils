import { ConstructorOptions, EventEmitter2, Listener } from "eventemitter2";
import "reflect-metadata";
import { Event } from "../../events/Event";
import { EventBus, EventHandler, getEventNamespaceFromObject, SubscriptionTarget } from "../EventBus";
import { SubscriptionTargetInfo } from "../SubscriptionTargetInfo";

export class EventEmitter2EventBus implements EventBus {
    private readonly emitter: EventEmitter2;

    private readonly listeners = new Map<number, Listener>();
    private nextId = 0;

    private runningTasks = 0;
    private addRunningTask(): void {
        this.runningTasks++;
    }

    private removeRunningTask(): void {
        this.runningTasks--;

        this.onTasksDecrement?.();
    }

    private onTasksDecrement?: () => void = undefined;

    public constructor(options?: ConstructorOptions) {
        this.emitter = new EventEmitter2({ ...options, wildcard: true, maxListeners: 50, verboseMemoryLeak: true });
    }

    public subscribe<TEvent = any>(
        subscriptionTarget: SubscriptionTarget<TEvent>,
        handler: EventHandler<TEvent>
    ): number {
        return this.registerHandler(subscriptionTarget, handler);
    }

    public subscribeOnce<TEvent = any>(
        subscriptionTarget: SubscriptionTarget<TEvent>,
        handler: EventHandler<TEvent>
    ): number {
        return this.registerHandler(subscriptionTarget, handler, true);
    }

    public unsubscribe<TEvent = any>(_subscriptionTarget: SubscriptionTarget<TEvent>, subscriptionId: number): boolean {
        return this.unregisterHandler(subscriptionId);
    }

    private registerHandler<TEvent>(
        subscriptionTarget: SubscriptionTarget<TEvent>,
        handler: EventHandler<TEvent>,
        isOneTimeHandler = false
    ): number {
        const subscriptionTargetInfo = SubscriptionTargetInfo.from(subscriptionTarget);
        const listenerId = this.nextId++;

        const handlerWrapper = async (event: TEvent) => {
            if (!subscriptionTargetInfo.isCompatibleWith(event)) {
                return;
            }

            this.addRunningTask();
            await handler(event);
            this.removeRunningTask();

            if (isOneTimeHandler) this.listeners.delete(listenerId);
        };

        if (isOneTimeHandler) {
            const listener = this.emitter.once(subscriptionTargetInfo.namespace, handlerWrapper);
            this.listeners.set(listenerId, listener as Listener);
            return listenerId;
        }

        const listener = this.emitter.on(subscriptionTargetInfo.namespace, handlerWrapper);
        this.listeners.set(listenerId, listener as Listener);
        return listenerId;
    }

    private unregisterHandler(listenerId: number): boolean {
        const listener = this.listeners.get(listenerId);
        if (!listener) {
            return false;
        }

        listener.off();
        this.listeners.delete(listenerId);
        return true;
    }

    public publish(event: Event): void {
        const namespace = getEventNamespaceFromObject(event);

        if (!namespace) {
            throw Error(
                "The event needs a namespace. Use the EventNamespace-decorator in order to define a namespace for a event."
            );
        }

        this.emitter.emit(namespace, event);
    }

    public async close(timeout?: number): Promise<void> {
        if (typeof this.onTasksDecrement !== "undefined") throw new Error("the eventbus is already closing");

        this.emitter.removeAllListeners();

        if (this.runningTasks === 0) return;

        const decrementPromise = new Promise<void>((resolve) => {
            this.onTasksDecrement = () => {
                if (this.runningTasks === 0) {
                    resolve();
                }
            };
        });
        if (!timeout) {
            return await decrementPromise.finally(() => {
                this.onTasksDecrement = undefined;
            });
        }

        const timeoutPromise = new Promise<void>((resolve, reject) =>
            setTimeout(() => {
                if (this.runningTasks === 0) return resolve();
                reject(new Error("timeout exceeded while waiting for events to process"));
            }, timeout)
        );
        return await Promise.race([decrementPromise, timeoutPromise]).finally(() => {
            this.onTasksDecrement = undefined;
        });
    }
}
