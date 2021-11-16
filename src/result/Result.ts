import { ApplicationError } from "./ApplicationError";

export class Result<T, E extends ApplicationError = ApplicationError> {
    private readonly _isSuccess: boolean;
    private readonly _error?: E;
    private readonly _value?: T;

    protected constructor(isSuccess: boolean, value?: T, error?: E) {
        if (isSuccess && error) {
            throw new Error("InvalidOperation: A result cannot be successful and contain an error");
        }
        if (!isSuccess && !error) {
            throw new Error("InvalidOperation: A failing result needs to contain an error");
        }

        if (value !== undefined && !isSuccess) {
            throw new Error("InvalidOperation: A value is only useful in case of a success.");
        }

        this._value = value;
        this._isSuccess = isSuccess;
        this._error = error;
    }

    public get isSuccess(): boolean {
        return this._isSuccess;
    }

    public get isError(): boolean {
        return !this._isSuccess;
    }

    public get error(): E {
        return this._error!;
    }

    public get value(): T {
        if (!this.isSuccess) {
            throw new Error("Can't get the value of an error result. Use 'error' instead.");
        }

        return this._value!;
    }

    public static ok<T, E extends ApplicationError = ApplicationError>(value: T): Result<T, E> {
        return new Result<T, E>(true, value);
    }

    public static fail<T, E extends ApplicationError = ApplicationError>(error: E): Result<T, E> {
        return new Result<T, E>(false, undefined, error);
    }
}
