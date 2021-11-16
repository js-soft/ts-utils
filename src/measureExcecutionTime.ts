/* eslint-disable no-console */
export function measureExcecutionTime(
    _target: Object,
    _propertyName: string,
    propertyDesciptor: PropertyDescriptor
): PropertyDescriptor {
    const method = propertyDesciptor.value;

    propertyDesciptor.value = async function (...args: any[]) {
        const t0 = Date.now();
        const result = await method.apply(this, args);
        const t1 = Date.now();
        console.info(`Execution time: ${t1 - t0}ms`);
        return result;
    };
    return propertyDesciptor;
}
