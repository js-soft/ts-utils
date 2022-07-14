import { Event, EventEmitter2EventBus, sleep } from "../src";

describe("EventEmitter2EventBus", () => {
    let eventBus: EventEmitter2EventBus;

    let eventsList: unknown[] = [];
    let counter = 0;

    beforeEach(() => {
        eventBus = new EventEmitter2EventBus();

        eventsList = [];
        counter = 0;
    });

    it("should process events before shutting down", async () => {
        eventBus.subscribe("test", async () => {
            await sleep(500);
            eventsList.push(counter++);
        });

        eventBus.publish(new Event("test"));
        eventBus.publish(new Event("test"));

        await eventBus.close();
        eventsList.push("closed");

        expect(eventsList).toEqual([0, 1, "closed"]);
    });

    it("should timeout processing the events when the events take to long", async () => {
        expect.assertions(1);

        eventBus.subscribe("test", async () => {
            await sleep(500);
            eventsList.push(counter++);
        });

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

    it("should unsubscribe from a subscribed event", () => {
        const subscriptionId = eventBus.subscribe("test", () => {
            eventsList.push(counter++);
        });

        eventBus.publish(new Event("test"));
        eventBus.unsubscribe(subscriptionId);

        eventBus.publish(new Event("test"));

        expect(eventsList).toEqual([0]);
    });

    it("should unsubscribe from a subscribed event using subscribeOnce", async () => {
        const subscriptionId = eventBus.subscribeOnce("test", () => {
            eventsList.push(counter++);
        });

        eventBus.unsubscribe(subscriptionId);
        eventBus.publish(new Event("test"));

        await sleep(20);

        expect(eventsList).toEqual([]);
    });
});
