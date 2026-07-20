// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025 Collab Digital Twins

import * as React from "react";
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import type { ApiAdapter } from "../ports/apiAdapter";
import type { User, Role } from "../../types/dbTypes";

export function createUserHooks(adapter: ApiAdapter) {
  // Call adapter methods inside hooks

  const useUsers = () => {
    const key = ["users"];
    const { data, error, isLoading } = useSWR<User[]>(
        key,
        () => adapter.getUsers(),
    );
    return {
        users: data ?? [],
        isLoading,
        isError: error,
    };
  };

  const useUser = (userId: string) => {
    const key = userId ? (["user", userId] as const) : null;
    const { data, error, isLoading } = useSWR<User>(key, () => adapter.getUser(userId));

    const { trigger: updateUser, isMutating, data: updatedData, error: updateError } = useSWRMutation(
      userId ? ["updateUser", userId] : null,
      async (_k, { arg }: { arg: Partial<User> }) => adapter.updateUser(userId, arg),
      {
        onSuccess: () => {
          mutate(["users"]);
          mutate(["user", userId]);
        },
      }
    );

    const { trigger: deleteUser, isMutating: isDeleting, error: deleteError } = useSWRMutation(
      userId ? ["deleteUser", userId] : null,
      async () => adapter.deleteUser(userId),
      {
        onSuccess: () => {
          mutate(["user", userId], undefined, { revalidate: false });
          mutate(["users"]);
        },
      }
    );

    return { user: data ?? null, isLoading, isError: error, updateUser, isMutating, updateError, updatedData, deleteUser, isDeleting, deleteError };
  };

  const useCreateUser = () => {
    const { trigger: createUser, isMutating, data: createdData, error } = useSWRMutation(
        ["createUser"],
        async (_key, { arg }: { arg: { userData: Partial<User> } }) =>
        adapter.createUser(arg),
        {
            onSuccess: () => {
                mutate(["users"]);
            },
        }
    );

    return {
        createUser,
        isMutating,
        createError: error,
        createdData,
    };
  };

  const useUserRole = (userId: string) => {
    const key = userId ? (["userRole", userId] as const) : null;
    const { data, error, isLoading } = useSWR<Role>(key, () => adapter.getUserRole(userId));

    const { trigger: updateUserRole, isMutating, data: updatedData, error: updateError } = useSWRMutation(
      userId ? (["updateUserRole", userId] as const) : null,
      async (_k, { arg }: { arg: { roleId: number } }) => adapter.updateUserRole(userId, arg.roleId),
      {
        onSuccess: () => {
          mutate(["userRole", userId]);
          mutate(["user", userId]);
          mutate(["users"]);
        },
      }
    );

    return { userRole: data ?? null, updateUserRole, isLoading, isError: error, isMutating, updatedData, updateError };
  };

  // Non-SWR password hooks
  const useVerifyPassword = (userId: string) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);
    const [isValid, setIsValid] = React.useState<boolean | null>(null);

    const verifyPassword = async (password: string) => {
      setIsLoading(true);
      setError(null);
      setIsValid(null);

      try {
        const ok = await adapter.verifyUserPassword(userId, password);
        setIsValid(ok);
        return ok;
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Failed to verify password");
        setError(err);
        setIsValid(false);
        return false;
      } finally {
        setIsLoading(false);
      }
    };
    return { verifyPassword, isLoading, error, isValid };
  }

  const useChangePassword = (userId: string) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<Error | null>(null);
    const [success, setSuccess] = React.useState(false);

    const changePassword = async (oldPassword: string, newPassword: string) => {
      setIsLoading(true);
      setError(null);
      setSuccess(false);
      try {
        await adapter.changeUserPassword(userId, oldPassword, newPassword);
        setSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Failed to change password"));
      } finally {
        setIsLoading(false);
      }
    };

    return { changePassword, isLoading, error, success };
  };

  return { useUsers, useUser, useCreateUser, useUserRole, useVerifyPassword, useChangePassword };
}