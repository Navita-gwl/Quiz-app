import type { LoaderFunctionArgs } from "react-router";
import { servePublicAsset } from "../utils/publicAssets.server";

export async function loader(_args: LoaderFunctionArgs) {
  return servePublicAsset("quiz.css", "text/css; charset=utf-8");
}
