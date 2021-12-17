// Processes zero or more mutations against a room, returning necessary pokes

import { Executor } from "../db/pg";
import { fastForwardRoom } from "../fastforward/fast-forward";
import { DBStorage } from "../storage/db-storage";
import { EntryCache } from "../storage/entry-cache";
import { ClientPokeBody } from "../types/client-poke-body";
import { getClientRecord, putClientRecord } from "../types/client-record";
import { ClientID, ClientMap } from "../types/client-state";
import { RoomID } from "../types/room-state";
import { getVersion } from "../types/version";
import { must } from "../util/must";
import { PeekIterator } from "../util/peek-iterator";
import { generateMergedMutations } from "./generate-merged-mutations";
import { processFrame } from "./process-frame";
import { MutatorMap } from "./process-mutation";

export const FRAME_LENGTH_MS = 1000 / 60;

/**
 * Process all pending mutations that are ready to be processed for a room.
 * @param roomID room to process mutations for
 * @param clients active clients in the room
 * @param mutators all known mutators
 * @param startTime simulation time to start at
 * @param endTime simulation time to end at
 * @param executor database executor
 * @returns
 */
export async function processRoom(
  roomID: RoomID,
  clients: ClientMap,
  mutators: MutatorMap,
  startTime: number,
  endTime: number,
  executor: Executor
): Promise<ClientPokeBody[]> {
  const storage = new DBStorage(executor, roomID);
  const cache = new EntryCache(storage);

  // TODO: can/should we pass `clients` to fastForward instead?
  const clientIDs = [...clients.keys()];

  // Before running any mutations, fast forward connected clients to
  // current state.
  const gcr = async (clientID: ClientID) =>
    must(
      await getClientRecord(clientID, cache),
      `Client record not found: ${clientID}`
    );
  const currentVersion = must(await getVersion(cache));
  const pokes: ClientPokeBody[] = await fastForwardRoom(
    roomID,
    clientIDs,
    gcr,
    currentVersion,
    executor,
    startTime
  );

  for (const poke of pokes) {
    const cr = must(await getClientRecord(poke.clientID, cache));
    cr.baseCookie = poke.poke.cookie;
    putClientRecord(poke.clientID, cr, cache);
  }

  const mergedMutations = new PeekIterator(generateMergedMutations(clients));
  for (
    let frameStart = startTime;
    frameStart < endTime;
    frameStart += FRAME_LENGTH_MS
  ) {
    pokes.push(
      ...(await processFrame(
        mergedMutations,
        mutators,
        clientIDs,
        cache,
        frameStart,
        frameStart + FRAME_LENGTH_MS
      ))
    );
  }

  await cache.flush();
  return pokes;
}