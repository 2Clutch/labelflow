import "@testing-library/jest-dom";
import "fake-indexeddb/auto";
import fetchMock from "jest-fetch-mock";
import CacheStorage from "service-worker-mock/models/CacheStorage";
import Request from "service-worker-mock/models/Request";
import Response from "service-worker-mock/models/Response";

Object.assign(global, {
  caches: new CacheStorage(),
  Request,
  Response,
});

fetchMock.enableMocks();

/**
 * We bypass the structured clone algorithm as its current js implementation
 * doesn't support blobs.
 * It might make our tests a bit different from what would actually happen
 * in a browser.
 */
jest.mock("fake-indexeddb/build/lib/structuredClone", () => ({
  default: (i: any) => i,
}));

export {};
