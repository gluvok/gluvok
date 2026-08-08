import { NextRequest } from "next/server"
import { handleLogin } from "../../login/handler"
import { LoginClient } from "@/lib/constants/enums"

export async function POST(request: NextRequest) {
  return handleLogin(request, LoginClient.DEVICE)
}