import { WorkspaceType, WorkspacePlan } from "@labelflow/graphql-types";
import { notImplementedInLocalWorkspaceRepository } from "./utils";

export const localWorkspace = {
  id: "2df392a2-7234-4767-82f3-85daff3d94dc",
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z",
  name: "Local",
  slug: "local",
  type: WorkspaceType.Local,
  plan: WorkspacePlan.Community,
};

export const getWorkspace = async () => localWorkspace;
export const listWorkspaces = async () => [localWorkspace];
export const updateWorkspace = async () => {
  notImplementedInLocalWorkspaceRepository();
  return false;
};
export const addWorkspace = async () => {
  notImplementedInLocalWorkspaceRepository();
  return "local";
};
