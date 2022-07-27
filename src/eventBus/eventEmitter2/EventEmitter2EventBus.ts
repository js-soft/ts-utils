import { ConstructorOptions, EventEmitter2, Listener } from "eventemitter2";
import "reflect-metadata";
import { Event } from "../../events/Event";
import { EventBus, EventHandler, getEventNamespaceFromObject, SubscriptionTarget } from "../EventBus";
import { SubscriptionTargetInfo } from "../SubscriptionTargetInfo";

export class EventEmitter2EventBus implements EventBus {
    protected readonly emitter: EventEmitter2;

    private readonly listeners = new Map<number, Listener>();
    private nextId = 0;
    private invocationPromises: (Promise<void> | void)[] = [];

    public constructor(
        private readonly errorCallback: (error: unknown, namespace: string) => void,
        eventEmitter2Options?: Omit<ConstructorOptions, "wildcard">
    ) {
        this.emitter = new EventEmitter2({
            maxListeners: 50,
            verboseMemoryLeak: true,
            ...eventEmitter2Options,
            wildcard: true
        });
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

    public unsubscribe(subscriptionId: number): boolean {
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

            const invocationPromise = (async () => await handler(event))();
            this.invocationPromises.push(invocationPromise);
            await invocationPromise.catch((e) => this.errorCallback(e, subscriptionTargetInfo.namespace));
            this.invocationPromises = this.invocationPromises.filter((p) => p !== invocationPromise);

            if (isOneTimeHandler) this.listeners.delete(listenerId);
        };

        if (isOneTimeHandler) {
            const listener = this.emitter.once(subscriptionTargetInfo.namespace, handlerWrapper, { objectify: true });
            this.listeners.set(listenerId, listener as Listener);
            return listenerId;
        }

        const listener = this.emitter.on(subscriptionTargetInfo.namespace, handlerWrapper, { objectify: true });
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
        this.emitter.removeAllListeners();

        const waitForInvocations = Promise.all(this.invocationPromises).catch(() => {
            /* ignore errors */
        });

        if (!timeout) {
            await waitForInvocations;
            return;
        }

        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<void>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error("timeout exceeded while waiting for events to process"));
            }, timeout);
        });

        await Promise.race([waitForInvocations, timeoutPromise]);

        clearTimeout(timeoutId!);
    }
}
