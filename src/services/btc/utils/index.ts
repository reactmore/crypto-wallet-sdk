
/**
 * https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array/12646864#12646864
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
export const shuffleArray = <T>(...arrayIn: T[] | T[][]): T[] => {
  const array: T[] =
    arrayIn.length === 1 && Array.isArray(arrayIn[0])
      ? (arrayIn[0] as T[])
      : (arrayIn as T[]);

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
};
