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

    test.each([
        [["test"], '"test"'],
        [["aString", "anotherString"], '"aString", "anotherString"'],
        [[{ aKey: "aValue" }], '{"aKey":"aValue"}'],
        [[{ aKey: "aValue" }, { aKey: "aValue" }], '{"aKey":"aValue"}, {"aKey":"aValue"}']
    ])("when logParams=true, logs parameters ('%p') on entry", (args: any[], formattedParams: string) => {
        decoratedClass.logParams(...args);

        expect(decoratedClass.log.traceLog).toStrictEqual([
            [`Calling logParams(${formattedParams})`],
            ["Returning from logParams"]
        ]);
    });

    test.each([
        ["test", '"test"'],
        [{ aKey: "aValue" }, '{"aKey":"aValue"}']
    ])("when logReturnValue=true, logs return value ('%p') on exit", (value: any, formattedReturnValue: string) => {
        decoratedClass.logReturnValue(value);

        expect(decoratedClass.log.traceLog).toStrictEqual([
            ["Calling logReturnValue"],
            [`Returning from logReturnValue with: ${formattedReturnValue}`]
        ]);
    });

    test.each(["test", new ErrorWithoutStack("anErrorMessage"), new Error("anErrorMessage")])(
        "logs errors that are thrown for the error: '%p'",
        (error: string | Error) => {
            expect(() => decoratedClass.logError(error)).toThrow(error);

            expect(decoratedClass.log.errorLog).toStrictEqual([["Error in logError:", error]]);
        }
    );

    test("preserves the original stacktrace in case of a simple call (the log decorator call is not included)", () => {
        expect(() => decoratedClass.throwError()).toThrow(new Error("anErrorMessage"));

        expect(decoratedClass.log.errorLog).toHaveLength(1);

        const error = decoratedClass.log.errorLog[0][1];
        expect(error).toBeInstanceOf(Error);
        expect(error.stack).not.toMatch(/logDecorator.ts/);
    });

    test("preserves the original stacktrace in case of nested calls", () => {
        expect(() => decoratedClass.callsThrowError()).toThrow(new Error("anErrorMessage"));

        expect(decoratedClass.log.errorLog).toHaveLength(2);

        const error = decoratedClass.log.errorLog[1][1];
        expect(error).toBeInstanceOf(Error);
        expect(error.stack).not.toMatch(/logDecorator.ts/);
    });
});
