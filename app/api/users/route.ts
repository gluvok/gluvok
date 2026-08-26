import { NextResponse } from "next/server";
import { withAuth } from "@/db/helpers";
import { TableName, EntityKey } from "@/lib/constants/enums";

export const GET = withAuth(async (_req, user, client) => {
  const query = client
    .from(TableName.USERS)
    .select(
      `${EntityKey.ID}, ${EntityKey.USERNAME}, ${EntityKey.ROLE}, ${EntityKey.FACTORY_ID}, ${EntityKey.IS_ACTIVE}`,
    )
    .eq(EntityKey.IS_ACTIVE, true)
    .eq(EntityKey.FACTORY_ID, user.factory_id!);

  const { data: rows, error } = await query;
  if (error) {
    console.error("GET users error:", error);
    return NextResponse.json({ data: [] });
  }

  return NextResponse.json({ data: rows || [] });
});
