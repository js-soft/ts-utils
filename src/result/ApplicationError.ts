export class ApplicationError extends Error {
    public constructor(public readonly code: string, message: string, public readonly data?: any) {
        super(message);
    }

    public equals(error: ApplicationError): boolean {
        return this.code === error.code;
    }

    public override toString(): string {
        return JSON.stringify({ code: this.code, message: this.message, data: this.data }, undefined, 2);
    }
}
