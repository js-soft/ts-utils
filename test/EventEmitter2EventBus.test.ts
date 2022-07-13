import { Event, EventBus, EventEmitter2EventBus, sleep, SubscriptionTarget } from "../src";

export async function waitForEvent<TEvent>(
    eventBus: EventBus,
    subscriptionTarget: SubscriptionTarget<TEvent>,
    timeout?: number,
    assertionFunction?: (t: TEvent) => boolean
): Promise<TEvent> {
    let subscriptionId: number;

    const eventPromise = new Promise<TEvent>((resolve) => {
        subscriptionId = eventBus.subscribe(subscriptionTarget, (event: TEvent) => {
            if (assertionFunction && !assertionFunction(event)) return;

            resolve(event);
        });
    });
    if (!timeout) return await eventPromise.finally(() => eventBus.unsubscribe(subscriptionTarget, subscriptionId));

    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<TEvent>((_resolve, reject) => {
        timeoutId = setTimeout(
            () =>
                reject(
                    new Error(
                        `timeout exceeded for waiting for event ${
                            typeof subscriptionTarget === "string" ? subscriptionTarget : subscriptionTarget.name
                        }`
                    )
                ),
            timeout
        );
    });

    return await Promise.race([eventPromise, timeoutPromise]).finally(() => {
        eventBus.unsubscribe(subscriptionTarget, subscriptionId);
        clearTimeout(timeoutId);
    });
}

describe("EventEmitter2EventBus", () => {
    let eventBus: EventEmitter2EventBus;

    let eventsList: unknown[] = [];
    let counter = 0;

    beforeEach(() => {
        eventBus = new EventEmitter2EventBus();
    });

    afterEach(() => {
        eventsList = [];
        counter = 0;
    });

    function subscribeOneSecondTest() {
        eventBus.subscribe("test", async () => {
            await sleep(500);
            eventsList.push(counter++);
        });
    }

    it("should process events before shutting down", async () => {
        subscribeOneSecondTest();

        eventBus.publish(new Event("test"));
        eventBus.publish(new Event("test"));

        await eventBus.close();
        eventsList.push("closed");

        expect(eventsList).toEqual([0, 1, "closed"]);
    });

    it("should timeout processing the events when the events take to long", async () => {
        expect.assertions(1);
        subscribeOneSecondTest();

        eventBus.publish(new Event("test"));

        await expect(eventBus.close(10)).rejects.toEqual(
            new Error("timeout exceeded while waiting for events to process")
        );
    });

    it("should only subscribe once", async () => {
        eventBus.subscribeOnce("test", () => {
            eventsList.push(counter++);
        });

        eventBus.publish(new Event("test"));
        eventBus.publish(new Event("test"));

        await sleep(20);

        expect(eventsList).toEqual([0]);
    });
});
