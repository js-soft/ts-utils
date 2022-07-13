import { Event } from "../events/Event";

export type EventHandler<TEvent> = (event: TEvent) => void | Promise<void>;
export type EventConstructor<TEvent> = new (...args: any[]) => TEvent;
export type SubscriptionTarget<TEvent> = string | EventConstructor<TEvent>;

export abstract class EventBus {
    public abstract subscribe<TEvent = any>(namespace: string, handler: EventHandler<TEvent>): number;
    public abstract subscribe<TEvent>(
        eventConstructor: EventConstructor<TEvent>,
        handler: EventHandler<TEvent>
    ): number;
    public abstract subscribe<TEvent = any>(
        subscriptionTarget: SubscriptionTarget<TEvent>,
        handler: EventHandler<TEvent>
    ): number;

    public abstract subscribeOnce<TEvent = any>(namespace: string, handler: EventHandler<TEvent>): number;
    public abstract subscribeOnce<TEvent>(
        eventConstructor: EventConstructor<TEvent>,
        handler: EventHandler<TEvent>
    ): number;
    public abstract subscribeOnce<TEvent = any>(
        subscriptionTarget: SubscriptionTarget<TEvent>,
        handler: EventHandler<TEvent>
    ): number;

    public abstract unsubscribe<TEvent = any>(
        subscriptionTarget: SubscriptionTarget<TEvent>,
        subscriptionId: number
    ): boolean;

    public abstract publish(event: object): void;
}

export function getEventNamespaceFromObject(targetObject: Event): string {
    return targetObject.namespace;
}
