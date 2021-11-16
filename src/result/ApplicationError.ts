export class ApplicationError extends Error {
    public readonly code: string;
    public readonly data?: any;

    public constructor(code: string, message: string, data?: any) {
        super(message);
        this.code = code;
        this.data = data;
    }

    public equals(error: ApplicationError): boolean {
        return this.code === error.code;
    }
}
