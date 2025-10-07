// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null;
    readonly rootMargin: string;
    readonly thresholds: ReadonlyArray<number>;

    constructor(private callback: IntersectionObserverCallback) {
      this.root = null;
      this.rootMargin = "0px";
      this.thresholds = [0];
    }

    observe(target: Element): void {
      this.callback(
        [
          {
            isIntersecting: false,
            target,
            intersectionRatio: 0,
            time: Date.now(),
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
          },
        ],
        this,
      );
    }

    unobserve(): void {
      /* noop */
    }

    disconnect(): void {
      /* noop */
    }

    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  // @ts-expect-error define in jsdom
  window.IntersectionObserver = MockIntersectionObserver;
  // @ts-expect-error define in jsdom
  window.IntersectionObserverEntry = class {};
}
