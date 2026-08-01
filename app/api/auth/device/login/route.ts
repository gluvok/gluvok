import { NextRequest } from "next/server"
import { handleLogin } from "../../login/handler"

export async function POST(request: NextRequest) {
  return handleLogin(request, "device")
}