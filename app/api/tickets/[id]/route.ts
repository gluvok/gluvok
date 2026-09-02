/**
 * @file app/api/tickets/[id]/route.ts
 * @description API route for fetching, updating concern, and deleting a single support ticket.
 */

import { NextResponse } from "next/server";
import { withAuth, apiError, forbiddenError, hasPermission, StatusCodes } from "@/db/helpers";
import { PermissionKey, ProjectSlug, Role } from "@/lib/constants/enums";
import { updateTicketConcernSchema } from "@/lib/validation/tickets";

export const GET = withAuth<{ id: string }>(async (_req, user, client, ctx) => {
  if (!hasPermission(user, ProjectSlug.TICKETS, PermissionKey.READ)) {
    return forbiddenError();
  }

  const { id } = await ctx.params;
  const ticketId = Number(id);
  if (isNaN(ticketId)) {
    return apiError("Invalid ticket identifier", StatusCodes.BAD_REQUEST);
  }

  const { data: ticket, error } = await client
    .from("tickets")
    .select(
      `
      id,
      concern,
      reply,
      status,
      entry_id,
      weighment_id,
      user_id,
      created_at,
      updated_at,
      users!inner(id, name, username, factory_id),
      entries!left(id, vehicle_number, weight, status, created_at),
      weighments!left(id, unit, gross_weight, tare_weight, net_weight, created_at, in_entry:in_entry_id(vehicle_number))
    `,
    )
    .eq("id", ticketId)
    .eq("users.factory_id", user.factory_id!)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !ticket) {
    return apiError("Ticket not found", StatusCodes.NOT_FOUND);
  }

  return NextResponse.json({ data: ticket });
});

export const PATCH = withAuth<{ id: string }>(async (req, user, client, ctx) => {
  if (!hasPermission(user, ProjectSlug.TICKETS, PermissionKey.WRITE)) {
    return forbiddenError();
  }

  const { id } = await ctx.params;
  const ticketId = Number(id);
  if (isNaN(ticketId)) {
    return apiError("Invalid ticket identifier", StatusCodes.BAD_REQUEST);
  }

  const body = await req.json();

  // Explicitly block in-app status and reply mutations
  if (body.status !== undefined || body.reply !== undefined) {
    return apiError(
      "Ticket status and reply cannot be modified via the application; they are managed by the database user",
      StatusCodes.FORBIDDEN,
    );
  }

  const parsed = updateTicketConcernSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, StatusCodes.BAD_REQUEST);
  }

  // Fetch existing ticket to check ownership and factory
  const { data: existingTicket, error: fetchError } = await client
    .from("tickets")
    .select("id, user_id, status, users!inner(factory_id)")
    .eq("id", ticketId)
    .eq("users.factory_id", user.factory_id!)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError || !existingTicket) {
    return apiError("Ticket not found", StatusCodes.NOT_FOUND);
  }

  const userId = parseInt(user.sub, 10);
  const isOwner = existingTicket.user_id === userId;
  const isAdmin = user.role === Role.ADMIN;

  if (!isAdmin && !isOwner) {
    return forbiddenError();
  }

  const { data: updated, error: updateError } = await client
    .from("tickets")
    .update({
      concern: parsed.data.concern,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .select(
      `
      id,
      concern,
      reply,
      status,
      entry_id,
      weighment_id,
      user_id,
      created_at,
      updated_at,
      users(id, name, username),
      entries(id, vehicle_number, weight, status),
      weighments(id, unit, gross_weight, tare_weight, net_weight)
    `,
    )
    .single();

  if (updateError || !updated) {
    return apiError("Failed to update ticket", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  return NextResponse.json({ data: updated });
});

export const DELETE = withAuth<{ id: string }>(async (_req, user, client, ctx) => {
  if (!hasPermission(user, ProjectSlug.TICKETS, PermissionKey.DELETE)) {
    return forbiddenError();
  }

  const { id } = await ctx.params;
  const ticketId = Number(id);
  if (isNaN(ticketId)) {
    return apiError("Invalid ticket identifier", StatusCodes.BAD_REQUEST);
  }

  const { data: existingTicket, error: fetchError } = await client
    .from("tickets")
    .select("id, user_id, users!inner(factory_id)")
    .eq("id", ticketId)
    .eq("users.factory_id", user.factory_id!)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError || !existingTicket) {
    return apiError("Ticket not found", StatusCodes.NOT_FOUND);
  }

  const userId = parseInt(user.sub, 10);
  const isOwner = existingTicket.user_id === userId;
  const isAdmin = user.role === Role.ADMIN;

  if (!isAdmin && !isOwner) {
    return forbiddenError();
  }

  const { error: deleteError } = await client
    .from("tickets")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (deleteError) {
    return apiError("Failed to delete ticket", StatusCodes.INTERNAL_SERVER_ERROR);
  }

  return NextResponse.json({ success: true, message: "Ticket deleted successfully" });
});
