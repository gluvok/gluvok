"use client";

/**
 * @file components/projects/dialog/entity-content.tsx
 * @description Dispatcher for EntityDialog: renders TicketViewContent in view mode or EntityFormContent in edit/create modes.
 */

import React from "react";
import { type EntityDialogContentProps } from "./types";
import { ProjectSlug, DialogMode } from "@/lib/constants/enums";
import { TicketViewContent } from "./ticket-view-content";
import { EntityFormContent } from "./entity-form-content";

export function EntityDialogContent(props: EntityDialogContentProps) {
  if (props.mode === DialogMode.VIEW && props.projectSlug === ProjectSlug.TICKETS && props.item) {
    return (
      <TicketViewContent
        item={props.item}
        primaryIdKey={props.primaryIdKey}
        onOpenChange={props.onOpenChange}
      />
    );
  }

  return <EntityFormContent {...props} />;
}
