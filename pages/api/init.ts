import { createDatabase } from "reps";
import type { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    await createDatabase();
    res.end("OK");
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal error");
  }
};
