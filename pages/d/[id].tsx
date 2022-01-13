import { useEffect, useState } from "react";
import { Client, Replicache } from "reps/out/client";
import { Designer } from "../../frontend/designer";
import { Nav } from "../../frontend/nav";
import { M, mutators } from "../../datamodel/mutators";
import { randUserInfo } from "../../datamodel/client-state";
import { randomShape } from "../../datamodel/shape";

export default function Home() {
  const [rep, setRep] = useState<Replicache<M> | null>(null);

  // TODO: Replicache + SSR could be cool!
  useEffect(() => {
    const [, , roomID] = location.pathname.split("/");

    (async () => {
      const r = new Replicache({
        name: roomID,
        mutators,

        // TODO: Do we need these?
        // TODO: figure out backoff?
        pushDelay: 0,
        requestOptions: {
          maxDelayMs: 0,
          minDelayMs: 0,
        },

        // We only use pull to get the base cookie.
        pullInterval: null,
      });

      new Client(r, roomID);

      const defaultUserInfo = randUserInfo();
      await r.mutate.initClientState({
        id: await r.clientID,
        defaultUserInfo,
      });
      r.onSync = (syncing: boolean) => {
        if (!syncing) {
          r.onSync = null;
          r.mutate.initShapes(Array.from({ length: 5 }, () => randomShape()));
        }
      };

      setRep(r);
    })();
  }, []);

  if (!rep) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        background: "rgb(229,229,229)",
      }}
    >
      <Nav rep={rep} />
      <Designer {...{ rep }} />
    </div>
  );
}
