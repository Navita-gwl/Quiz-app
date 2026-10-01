import type { LoaderFunctionArgs } from "react-router";
import { servePublicAsset } from "../utils/publicAssets.server";

export async function loader(_args: LoaderFunctionArgs) {
  return servePublicAsset("quiz.js", "application/javascript; charset=utf-8");
}
