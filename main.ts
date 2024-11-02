import { NostrFetcher } from "nostr-fetch";

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (!import.meta.main) {
  Deno.exit(1);
}

/**
 * Relays
 */

const relays = [
  "wss://yabu.me/",
  "wss://relay-jp.nostr.wirednet.jp/",
  "wss://r.kojira.io/",
];
console.log("[relays]", relays);

/**
 * Fetch
 */

using fetcher = NostrFetcher.init();

const events = await fetcher.fetchLatestEvents(
  relays,
  { kinds: [1] },
  1000,
);
console.log("[events]", events.length);

/**
 * Filter
 */

const regex = /https:\/\/\S+?\.(avif|jpg|jpeg|png|webp)/g;
const filteredEvents = events.filter((event) => regex.test(event.content));
console.log("[filtered events]", filteredEvents);

/**
 * Extract
 */
const urls = filteredEvents.flatMap((
  event,
) => event.content.match(regex)).filter((x) => x !== null);
console.log("[urls]", urls, urls.length);

/**
 * Compare
 */
if (urls.length === 0) {
  Deno.exit();
}

const optimizers = [
  [
    "ocknamo",
    "https://nostr-image-optimizer.ocknamo.com/image/quality=60,width=800,format=webp/",
  ],
  [
    "yabu.me",
    "https://api.yabu.me/v0/images/optimize/quality=60,width=800,format=webp/",
  ],
  [
    "none",
    "",
  ],
];

const totalTimes = new Map([
  ["ocknamo", 0],
  ["yabu.me", 0],
  ["none", 0],
]);

const totalSizes = new Map([
  ["ocknamo", 0],
  ["yabu.me", 0],
  ["none", 0],
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

for (const url of urls) {
  for (const [key, optimizerUrl] of optimizers) {
    const requestUrl = `${optimizerUrl}${url}`;
    const start = Date.now();
    const response = await fetch(requestUrl, {
      headers: {
        "Accept":
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    const time = Date.now() - start;
    const size = Number(response.headers.get("Content-Length"));

    const totalTime = totalTimes.get(key);
    if (totalTime !== undefined) {
      totalTimes.set(key, totalTime + time);
    } else {
      console.error("[something wrong]");
    }
    const totalSize = totalSizes.get(key);
    if (totalSize !== undefined) {
      totalSizes.set(key, totalSize + size);
    } else {
      console.error("[something wrong]");
    }

    console.log(
      "[response]",
      key,
      response.ok,
      response.status,
      response.statusText,
      response.headers.get("Content-Type"),
      response.headers.get("Content-Length"),
      time,
      requestUrl,
    );

    if (!response.ok) {
      const start = Date.now();
      const originalResponse = await fetch(url);
      const time = Date.now() - start;
      const size = Number(originalResponse.headers.get("Content-Length"));

      const totalTime = totalTimes.get(key);
      if (totalTime !== undefined) {
        totalTimes.set(key, totalTime + time);
      } else {
        console.error("[something wrong]");
      }
      const totalSize = totalSizes.get(key);
      if (totalSize !== undefined) {
        totalSizes.set(key, totalSize + size);
      } else {
        console.error("[something wrong]");
      }

      console.log(
        "[response original]",
        key,
        originalResponse.ok,
        originalResponse.status,
        originalResponse.statusText,
        originalResponse.headers.get("Content-Type"),
        originalResponse.headers.get("Content-Length"),
        time,
        url,
      );
    }
  }

  await sleep(2000);
}

console.log("[total time]", totalTimes);
console.log("[total size]", totalSizes);
