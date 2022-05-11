import { Event } from "../events/Event";

export type EventHandler<TEvent> = (event: TEvent) => void;
export type SubscriptionTarget<TEvent> = string | (new () => TEvent);

export abstract class EventBus {
    public abstract subscribe<TEvent = any>(namespace: string, handler: EventHandler<TEvent>): number;
    public abstract subscribe<TEvent = any>(eventConstructor: new () => TEvent, handler: EventHandler<TEvent>): number;
    public abstract subscribe<TEvent = any>(
        subscriptionTarget: SubscriptionTarget<TEvent>,
        handler: EventHandler<TEvent>
    ): number;

    public abstract subscribeOnce<TEvent = any>(namespace: string, handler: EventHandler<TEvent>): number;
    public abstract subscribeOnce<TEvent = any>(
        eventConstructor: new () => TEvent,
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
