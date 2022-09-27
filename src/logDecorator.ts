import stringify from "json-stringify-safe";

export interface LogDecoratorDecoratable {
    log: {
        trace(...messages: any[]): void;
        debug(...messages: any[]): void;
        info(...messages: any[]): void;
        warn(...messages: any[]): void;
        error(...messages: any[]): void;
        fatal(...messages: any[]): void;
    };
}

export interface LogDecoratorParams {
    logReturnValue?: boolean;
    logParams?: boolean;
}

export function log<T extends LogDecoratorDecoratable>(params?: LogDecoratorParams) {
    return function (
        _target: T,
        propertyName: string,
        propertyDescriptorDoNotChangeMyNamePlease: PropertyDescriptor
    ): PropertyDescriptor {
        const method = propertyDescriptorDoNotChangeMyNamePlease.value;

        propertyDescriptorDoNotChangeMyNamePlease.value = function (...args: any[]) {
            const thisT = this as T;

            try {
                if (params?.logParams) {
                    thisT.log.trace(`Calling ${propertyName}(${args.map((a) => stringify(a)).join(", ")})`);
                } else {
                    thisT.log.trace(`Calling ${propertyName}`);
                }

                const returnValue = method.apply(this, args);

                if (params?.logReturnValue) {
                    thisT.log.trace(`Returning from ${propertyName} with: ${stringify(returnValue)}`);
                } else {
                    thisT.log.trace(`Returning from ${propertyName}`);
                }

                return returnValue;
            } catch (error) {
                if (error instanceof Error && error.stack) {
                    error.stack = error.stack
                        .split("\n")
                        .filter((s) => !s.includes(".propertyDescriptorDoNotChangeMyNamePlease.value"))
                        .join("\n");
                }

                thisT.log.error(`Error in ${propertyName}:`, error);
                throw error;
            }
        };
        return propertyDescriptorDoNotChangeMyNamePlease;
    };
}
