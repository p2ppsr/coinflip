/**
 * Verify a variable is not null or undefined.
 * If the variable is null or undefined, this function will throw an error.
 *
 * @param {T | null | undefined} v - Variable to be verified
 * @returns {T} - Returns the variable if it is neither null nor undefined.
 * @throws {Error} - Throws an error if the truthy value could not be verified.
 */
export const verifyTruthy = <T>(v: T | null | undefined): T => {
    if (v == null) {
        throw new Error('A bad thing has happened.')
    }
    return v
}

export const sleep = async (ms: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, ms))
}

export const objectHasEmptyValues = (obj: any): boolean => {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key]
            // Check for null or undefined directly
            if (value === null || value === undefined) {
                return true
            }
            // Check for an empty string
            if (typeof value === 'string' && value.trim() === '') {
                return true
            }
            // If it's an object (and not null, which is typeof 'object'), recurse
            if (typeof value === 'object') {
                if (Array.isArray(value) && value.length === 0) {
                    // Check if it's an empty array
                    return true
                } else if (objectHasEmptyValues(value)) {
                    // Recursive check for nested objects
                    return true
                }
            }
        }
    }
    return false
}