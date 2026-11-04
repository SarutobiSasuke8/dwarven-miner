import { createFileRoute } from "@tanstack/react-router";
import { DwarvenMiner } from "@/components/dwarven-miner";

export const Route = createFileRoute("/")({
  component: DwarvenMiner,
});
