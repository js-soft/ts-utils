import { log } from "../src";

class ErrorWithoutStack extends Error {
    public constructor(message: string) {
        super(message);
        this.stack = undefined;
    }
}

class MockLogger {
    public traceLog: any[][] = [];
    public trace(...args: any[]): void {
        this.traceLog.push(args);
    }

    private errorToString(error: Error): string {
        return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
    }

    public errorLog: any[][] = [];
    public error(...args: any[]): void {
        args = args.map((arg) => (arg instanceof Error ? this.errorToString(arg) : arg));
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
    public logParams<T>(...value: T[]): T[] {
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

    @log()
    public callsThrowError(): void {
        this.throwError();
    }
}

describe("@log", () => {
    let decoratedClass: DecoratedClass;
    beforeEach(() => (decoratedClass = new DecoratedClass(new MockLogger())));

    test.each(["test", { aKey: "aValue" }, undefined, null])(
        "returns original return value for '%p'",
        (value: unknown) => {
            expect(decoratedClass.doNotLogValues(value)).toBe(value);
        }
    );

    test("logs method name on entry and exit", () => {
        decoratedClass.doNotLogValues("test");

        expect(decoratedClass.log.traceLog).toStrictEqual([
            ["Calling doNotLogValues"],
            ["Returning from doNotLogValues"]
        ]);
    });

    test.each(["test", { aKey: "aValue" }, ["aString", "anotherString"], [{ aKey: "aValue" }, { aKey: "aValue" }]])(
        "when logParams=true, logs parameters ('%p') on entry",
        (...value: any[]) => {
            decoratedClass.logParams(...value);

            expect(decoratedClass.log.traceLog).toStrictEqual([
                [`Calling logParams(${value.map((v) => JSON.stringify(v)).join(", ")})`],
                ["Returning from logParams"]
            ]);
        }
    );

    test.each(["test", { aKey: "aValue" }])(
        "when logReturnValue=true, logs return value ('%p') on exit",
        (value: any) => {
            decoratedClass.logReturnValue(value);

            expect(decoratedClass.log.traceLog).toStrictEqual([
                ["Calling logReturnValue"],
                [`Returning from logReturnValue with: ${JSON.stringify(value)}`]
            ]);
        }
    );

    test.each([
        { error: "test", expectedMessage: "test" },
        { error: new ErrorWithoutStack("anErrorMessage"), expectedMessage: "Error: anErrorMessage" }
    ])(
        "logs errors that are thrown for the error: '$error'",
        (params: { error: string | Error; expectedMessage: string }) => {
            expect(() => decoratedClass.logError(params.error)).toThrow(params.error);

            expect(decoratedClass.log.errorLog).toStrictEqual([["Error in logError:", params.expectedMessage]]);
        }
    );

    test("preserves the original stacktrace in case of a simple call (the log decorator call is not included)", () => {
        expect(() => decoratedClass.throwError()).toThrow(new Error("anErrorMessage"));

        expect(decoratedClass.log.errorLog).toHaveLength(1);

        const concat = decoratedClass.log.errorLog[0].join(" ");
        expect(concat).not.toMatch(/logDecorator.ts/);
    });

    test("preserves the original stacktrace in case of nested calls", () => {
        expect(() => decoratedClass.callsThrowError()).toThrow(new Error("anErrorMessage"));

        expect(decoratedClass.log.errorLog).toHaveLength(2);

        const concat2 = decoratedClass.log.errorLog[1].join(" ");
        expect(concat2).not.toMatch(/logDecorator.ts/);
    });
});
