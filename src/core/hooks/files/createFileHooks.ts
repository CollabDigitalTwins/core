// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import type { ApiAdapter } from "../ports/apiAdapter";
import type { DbFile } from "../../types/dbTypes";

export function createFileHooks(adapter: ApiAdapter) {
  // Call adapter methods inside hooks
  const useFiles = () => {
    const key = ["files"];
    const { data, error, isLoading } = useSWR<DbFile[]>(key, () => adapter.listFiles());
    return { files: data ?? [], isLoading, isError: error };
  };

  const useFile = (id: number | null) => {
      const key = id ? ["file", id] as const : null;
      const { data, error, isLoading } = useSWR<DbFile>(
          key,
          () => adapter.listFile(id as number),
      );

      // SWR Mutation for updating a file
      const { trigger: updateFile, isMutating, data: updatedData, error: updateError } = useSWRMutation(
          id ? ["updateFile", id] : null,
          async (_key, { arg }: { arg: Partial<DbFile> }) =>
          adapter.updateFile(id as number, arg),
          {
              onSuccess: (updatedFile: DbFile) => {
                  if (!id) return;
                  // Revalidate the same keys used above, not endpoints
                  mutate(["file", id]);
                  mutate(["files"]);
                  if (updatedFile.attachedFilesBuildingId) {
                      mutate(["filesByBuilding", updatedFile.attachedFilesBuildingId, ""]);
                  }
                  if (updatedFile.attachedFilesSiteId) {
                      mutate(["filesBySite", updatedFile.attachedFilesSiteId, ""]);
                  }
              },
          }
      );

      return {
      file: data ?? null,
      isLoading,
      isError: error,
      updateFile,
      isMutating,
      updateError,
      updatedData,
      };
  };

  const useFilesByBuildingId = (buildingId: number, tag?: string) => {
    const key = buildingId ? (["filesByBuilding", buildingId, tag ?? ""] as const) : null;
    const { data, error, isLoading } = useSWR<DbFile[]>(
      key,
      () => adapter.listFilesByBuilding(buildingId, { tag })
    );
    return { files: data ?? [], isLoading, isError: error };
  };

  const useFilesBySiteId = (siteId: number, tag?: string) => {
    const key = siteId ? (["filesBySite", siteId, tag ?? ""] as const) : null;
    const { data, error, isLoading } = useSWR<DbFile[]>(
      key,
      () => adapter.listFilesBySite(siteId, { tag })
    );
    return { files: data ?? [], isLoading, isError: error };
  };

  const useUploadFileToBuilding = (buildingId: number) => {
    const { trigger: uploadFile, isMutating, data: uploadedData, error } = useSWRMutation(
      buildingId ? ["uploadFileToBuilding", buildingId] : null,
      async (_key, { arg }: { arg: { fileData: Partial<DbFile> } }) =>
        adapter.uploadFileToBuilding(buildingId, arg.fileData),
      {
        onSuccess: () => {
          mutate(["filesByBuilding", buildingId, ""]);
          mutate(["files"]);
          mutate(["building", buildingId]);
        },
      }
    );
    return { uploadFile, isMutating, uploadError: error, uploadedData };
  };

  const useUploadFileToSite = (siteId: number) => {
    const { trigger: uploadFile, isMutating, data: uploadedData, error } = useSWRMutation(
      siteId ? ["uploadFileToSite", siteId] : null,
      async (_key, { arg }: { arg: { fileData: Partial<DbFile> } }) =>
        adapter.uploadFileToSite(siteId, arg.fileData),
      {
        onSuccess: () => {
          mutate(["filesBySite", siteId, ""]);
          mutate(["files"]);
          mutate(["site", siteId]);
        },
      }
    );
    return { uploadFile, isMutating, uploadError: error, uploadedData };
  };

  const useUploadFileToUser = (userId: number) => {
    const { trigger: uploadFile, isMutating, data: uploadedData, error } = useSWRMutation(
      userId ? ["uploadFileToUser", userId] : null,
      async (_key, { arg }: { arg: { fileData: Partial<DbFile> } }) =>
        adapter.uploadFileToUser(userId, arg.fileData),
      {
        onSuccess: () => {
          mutate(["files"]);
          mutate(["user", userId]);
        },
      }
    );
    return { uploadFile, isMutating, uploadError: error, uploadedData };
  }

  const useDeleteFile = (buildingId?: number, siteId?: number) => {
    const { trigger, isMutating, data: deletedData, error } = useSWRMutation(
      ["deleteFile"],
      async (_key, { arg }: { arg: { fileId: number } }) => adapter.deleteFile(arg.fileId)
    );
    const deleteFile = async (fileId: number) => {
        await trigger({ fileId });
        // revalidate after the mutation using the fileId we have in scope
        mutate(["files"]);
        mutate(["file", fileId]);
        if (buildingId) {
          mutate(["filesByBuilding", buildingId, ""]);
          mutate(["building", buildingId]);
        }
        if (siteId) {
          mutate(["filesBySite", siteId, ""]);
          mutate(["site", siteId]);
        }
    };
    return { deleteFile, isMutating, deleteError: error, deletedData };
  };

  return {
    useFiles,
    useFile,
    useFilesByBuildingId,
    useFilesBySiteId,
    useUploadFileToBuilding,
    useUploadFileToSite,
    useUploadFileToUser,
    useDeleteFile,
  };
}
