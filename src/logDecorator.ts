/* eslint-disable no-console */
export function log(_target: Object, propertyName: string, propertyDesciptor: PropertyDescriptor): PropertyDescriptor {
    const method = propertyDesciptor.value;

    propertyDesciptor.value = function (...args: any[]) {
        const params = args.map((a) => JSON.stringify(a)).join();
        try {
            const result = method.apply(this, args);
            const r = JSON.stringify(result);
            console.log(`Call: ${propertyName}(${params}) => ${r}`);
            return result;
        } catch (error) {
            console.log(error);
            throw error;
        }
    };
    return propertyDesciptor;
}
