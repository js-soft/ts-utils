import { Event, EventEmitter2EventBus, sleep } from "../src";

describe("EventEmitter2EventBus", () => {
    let eventBus: EventEmitter2EventBus;
    let numberOfTriggeredEvents: number;

    beforeEach(() => {
        eventBus = new EventEmitter2EventBus();

        numberOfTriggeredEvents = 0;
    });

    test("processes events before shutting down", async () => {
        eventBus.subscribe("test", async () => {
            await sleep(500);
            numberOfTriggeredEvents++;
        });

        eventBus.publish(new Event("test"));
        eventBus.publish(new Event("test"));

        await eventBus.close();

        expect(numberOfTriggeredEvents).toBe(2);
    });

    test("timeouts while processing the events when the events take to long", async () => {
        eventBus.subscribe("test", async () => await sleep(500));

        eventBus.publish(new Event("test"));

        await expect(eventBus.close(10)).rejects.toStrictEqual(
            new Error("timeout exceeded while waiting for events to process")
        );
    });

    test("subscribes once", async () => {
        eventBus.subscribeOnce("test", () => {
            numberOfTriggeredEvents++;
        });

        eventBus.publish(new Event("test"));
        eventBus.publish(new Event("test"));

        await sleep(20);

        expect(numberOfTriggeredEvents).toBe(1);
    });

    test("unsubscribes from a subscribed event", () => {
        const subscriptionId = eventBus.subscribe("test", () => {
            numberOfTriggeredEvents++;
        });

        eventBus.publish(new Event("test"));
        eventBus.unsubscribe(subscriptionId);

        eventBus.publish(new Event("test"));

        expect(numberOfTriggeredEvents).toBe(1);
    });

    test("unsubscribes from a subscribed event using subscribeOnce", async () => {
        const subscriptionId = eventBus.subscribeOnce("test", () => {
            numberOfTriggeredEvents++;
        });

        eventBus.unsubscribe(subscriptionId);
        eventBus.publish(new Event("test"));

        await sleep(20);

        expect(numberOfTriggeredEvents).toBe(0);
    });
});
