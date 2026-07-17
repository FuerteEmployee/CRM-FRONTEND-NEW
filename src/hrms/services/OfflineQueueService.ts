// Stopgap stub: LocationService calls migrate()/enqueue()/processQueue(). Real
// IndexedDB/Dexie-backed offline persistence isn't implemented yet — these are
// safe no-ops so the location-tracking loop doesn't crash every 60s. A future
// pass should back these with real storage so location fixes actually survive
// an offline/killed-app gap instead of just being dropped silently.
export class OfflineQueueService {
  async migrate() {}
  async enqueue(_item: any) {}
  async processQueue() {}
}
export const offlineQueueService = new OfflineQueueService();
