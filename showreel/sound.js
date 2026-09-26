/* Sound — off until someone asks for it. (Filled in by T12.) */
export function createSound() {
  return {
    get on() { return false; },
    clock() { return null; },
    setOn() {},
    play() {},
    pause() {},
    seek() {},
    tick() {}
  };
}
