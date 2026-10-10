"use client";

import dynamic from "next/dynamic";
import { LoadingScreen } from "./ui/loading";

/** three.js stays out of the server render and the initial bundle. */
const GameCanvas = dynamic(() => import("./game-canvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => <LoadingScreen progress={0} />,
});

export function GameMount() {
  return <GameCanvas />;
}
