export const sleep = async (ms: number) => {
  await new Promise(resolve => setTimeout(resolve, ms))
}

export const objectHasEmptyValues = (obj: any): boolean => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // Check for null or undefined directly
      if (value === null || value === undefined) {
        return true;
      }
      // Check for an empty string
      if (typeof value === 'string' && value.trim() === '') {
        return true;
      }
      // If it's an object (and not null, which is typeof 'object'), recurse
      if (typeof value === 'object') {
        if (Array.isArray(value) && value.length === 0) {
          // Check if it's an empty array
          return true;
        } else if (objectHasEmptyValues(value)) {
          // Recursive check for nested objects
          return true;
        }
      }
    }
  }
  return false;
}
