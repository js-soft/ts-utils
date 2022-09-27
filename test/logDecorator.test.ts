import { log } from "../src";

class MockLogger {
    public traceLog: any[][] = [];
    public trace(...args: any[]): void {
        this.traceLog.push(args);
    }

    public errorLog: any[][] = [];
    public error(...args: any[]): void {
        this.errorLog.push(args);
    }

    public debug(): void {
        throw new Error("Method not implemented.");
    }

    public info(): void {
        throw new Error("Method not implemented.");
    }

    public warn(): void {
        throw new Error("Method not implemented.");
    }

    public fatal(): void {
        throw new Error("Method not implemented.");
    }

    public reset() {
        this.traceLog = [];
        this.errorLog = [];
    }
}

class DecoratedClass {
    public constructor(private readonly _logger: MockLogger) {}
    public get log(): MockLogger {
        return this._logger;
    }

    @log()
    public doNotLogValues<T>(value: T): T {
        return value;
    }

    @log({ logParams: true })
    public logParams<T>(value: T): T {
        return value;
    }

    @log({ logReturnValue: true })
    public logReturnValue<T>(value: T): T {
        return value;
    }

    @log({ logParams: true, logReturnValue: true })
    public logParamsAndReturnValue<T>(value: T): T {
        return value;
    }

    @log()
    public logError(errorToThrow: unknown): unknown {
        throw errorToThrow;
    }

    @log()
    public throwError(): void {
        throw new Error("anErrorMessage");
    }
}

describe("@log", () => {
    const logger = new MockLogger();
    const decoratedClass = new DecoratedClass(logger);
    beforeEach(() => logger.reset());

    test("annotated method does not alter return value", () => {
        expect(decoratedClass.doNotLogValues("test")).toBe("test");
        expect(decoratedClass.doNotLogValues({ aKey: "aValue" })).toStrictEqual({ aKey: "aValue" });
        expect(decoratedClass.doNotLogValues(undefined)).toBeUndefined();
    });

    test("should trace log method call and return", () => {
        decoratedClass.doNotLogValues("test");

        expect(decoratedClass.log.traceLog).toStrictEqual([
            ["Calling doNotLogValues"],
            ["Returning from doNotLogValues"]
        ]);
        expect(decoratedClass.log.errorLog).toHaveLength(0);
    });

    test("should trace log method call and return with params", () => {
        decoratedClass.logParams("test");

        expect(decoratedClass.log.traceLog).toStrictEqual([
            ['Calling logParams("test")'],
            ["Returning from logParams"]
        ]);
        expect(decoratedClass.log.errorLog).toHaveLength(0);
    });

    test("should trace log method call and return with return value", () => {
        decoratedClass.logReturnValue("test");

        expect(decoratedClass.log.traceLog).toStrictEqual([
            ["Calling logReturnValue"],
            ['Returning from logReturnValue with: "test"']
        ]);
        expect(decoratedClass.log.errorLog).toHaveLength(0);
    });

    test("should trace log method call and return with params and return value", () => {
        decoratedClass.logParamsAndReturnValue("test");

        expect(decoratedClass.log.traceLog).toStrictEqual([
            ['Calling logParamsAndReturnValue("test")'],
            ['Returning from logParamsAndReturnValue with: "test"']
        ]);
        expect(decoratedClass.log.errorLog).toHaveLength(0);
    });

    test("should log thrown error (string)", () => {
        expect(() => decoratedClass.logError("test")).toThrow("test");

        expect(decoratedClass.log.traceLog).toStrictEqual([["Calling logError"]]);
        expect(decoratedClass.log.errorLog).toStrictEqual([["Error in logError: test"]]);
    });

    test("should log thrown error (error object)", () => {
        const error = new Error("anErrorMessage");
        delete error.stack;

        expect(() => decoratedClass.logError(error)).toThrow(error);

        expect(decoratedClass.log.traceLog).toStrictEqual([["Calling logError"]]);
        expect(decoratedClass.log.errorLog).toStrictEqual([["Error in logError: Error: anErrorMessage"]]);
    });

    test("should get rid of the logDecorator in the call stack", () => {
        expect(() => decoratedClass.throwError()).toThrow(new Error("anErrorMessage"));

        expect(decoratedClass.log.traceLog).toStrictEqual([["Calling throwError"]]);
        expect(decoratedClass.log.errorLog).toStrictEqual([["Error in throwError: Error: anErrorMessage"]]);
    });
});
