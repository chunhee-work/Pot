/* placeholder — the synthesised score is built in its own task */
export function createSound() {
  return {
    get on() { return false; }, clock() { return null; }, get position() { return null; },
    get voicesReady() { return 0; }, get voicesFired() { return 0; },
    setOn() {}, play() {}, pause() {}, seek() {}, tick() {}, guard() {}
  };
}
