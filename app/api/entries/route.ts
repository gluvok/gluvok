import { GET as getAutomatic } from "./automatic/route";
import { GET as getManual } from "./manual/route";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  if (mode === "manual") {
    return getManual(request);
  }
  return getAutomatic(request);
}
