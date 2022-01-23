import { JSONType } from "../../src/protocol/json";
import { Mutation } from "../../src/protocol/push";
import { ClientMutation } from "../../src/types/client-mutation";
import { ClientID, ClientState, Socket } from "../../src/types/client-state";
import { RoomID, RoomMap, RoomState } from "../../src/types/room-state";
import { NullableVersion } from "../../src/types/version";

export function roomMap(...rooms: [RoomID, RoomState][]): RoomMap {
  return new Map(rooms);
}

export function room(
  id: RoomID,
  ...clients: [ClientID, ClientState][]
): [RoomID, RoomState] {
  return [id, { clients: new Map(clients) }];
}

export function client(
  id: ClientID,
  socket: Socket = new Mocket(),
  clockBehindByMs = 1,
  ...mutations: Mutation[]
): [ClientID, ClientState] {
  return [id, { clockBehindByMs, pending: mutations, socket }] as [
    string,
    ClientState
  ];
}

export function mutation(
  id: number,
  name = "foo",
  args: JSONType = [],
  timestamp = 1
): Mutation {
  return {
    id,
    name,
    args,
    timestamp,
  };
}

export function clientMutation(
  clientID: ClientID,
  id: number,
  name = "foo",
  args: JSONType = [],
  timestamp = 1
): ClientMutation {
  return {
    clientID,
    ...mutation(id, name, args, timestamp),
  };
}

export class Mocket implements Socket {
  log: string[][] = [];
  send(data: string): void {
    this.log.push(["send", data]);
  }
  close(): void {
    this.log.push(["close"]);
  }
  onclose: undefined;
  onmessage: undefined;
}

export function clientRecord(
  baseCookie: NullableVersion = null,
  lastMutationID = 1
) {
  return {
    baseCookie,
    lastMutationID,
  };
}

export function userValue(value: JSONType, version = 1, deleted = false) {
  return {
    value,
    version,
    deleted,
  };
}
