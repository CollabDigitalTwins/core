//needs private instance to work
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import type { ApiAdapter } from "../ports/apiAdapter";
import type { Comment } from '../../types/dbTypes'

export function createCommentHooks(adapter: ApiAdapter) {
    //Call adapter methods inside hooks

    const useComments = () => {
        const key = ["comments"]; // no endpoint string
        const { data, error, isLoading } = useSWR<Comment[]>(
            key,
            () => adapter.getComments(),
        );
        return {
            comments: data ?? [],
            isLoading,
            isError: error,
        };
    };

    const useCommentsByBuilding = (buildingId: number | null) => {
        const key = buildingId ? ["comments", "building", buildingId] as const : null;
        const { data, error, isLoading } = useSWR<Comment[]>(
            key,
            () => adapter.getCommentsByBuilding(buildingId as number),
        );
        return {
            comments: data ?? [],
            isLoading,
            isError: error,
        }
    };

    const useComment = (id: number | null) => {
        const key = id ? ["comment", id] as const : null;
        const { data, error, isLoading } = useSWR<Comment>(
            key,
            () => adapter.getComment(id as number),
            //{ refreshInterval: 1000 } 
        );

        // SWR Mutation for updating a comment
        const { trigger: updateComment, isMutating, data: updatedData, error: updateError } = useSWRMutation(
            id ? ["updateComment", id] : null,
            async (_key, { arg }: { arg: Partial<Comment> }) =>
            adapter.updateComment(id as number, arg),
            {
                onSuccess: (updated) => {
                    if (!id) return;
                    // Revalidate the same keys used above
                    mutate(["comment", id]);
                    mutate(["comments"]);
                    if (updated.buildingId) mutate(["comments", "building", updated.buildingId]);
                    if (updated.authorId) mutate(["commentsByAuthor", updated.authorId]);
                    if (data?.buildingId && data.buildingId !== updated.buildingId) mutate(["comments", "building", data.buildingId]);
                    if (data?.authorId && data.authorId !== updated.authorId) mutate(["commentsByAuthor", data.authorId]);
                },
            }
        );

        const { trigger: deleteComment, isMutating: isDeleting, error: deleteError } = useSWRMutation(
            id ? ["deleteComment", id] as const : null,
            async () => {
                const comment = await adapter.getComment(id as number);
                await adapter.deleteComment(id as number);
                return comment; // onSuccess context
            },
            {
            onSuccess: (comment) => {
                mutate(["comment", comment.id], undefined, { revalidate: false });
                mutate(["comments"]);
                if (comment.buildingId) mutate(["comments", "building", comment.buildingId]);
                if (comment.authorId) mutate(["commentsByAuthor", comment.authorId]);
            },
            }
        );

        return {
        comment: data ?? null,
        isLoading,
        isError: error,
        updateComment,
        isMutating,
        updateError,
        updatedData,
        deleteComment, 
        isDeleting, 
        deleteError
        };
    };

    const useCreateComment = () => {
        const { trigger: createComment, isMutating, data: createdData, error } = useSWRMutation(
            ["createComment"],
            async (_key, { arg }: { arg: { commentData: Partial<Comment> } }) =>
            adapter.createComment(arg),
            {
                onSuccess: (created) => {
                    mutate(["comments"]);
                    if (created.buildingId) mutate(["comments", "building", created.buildingId]);
                    if (created.authorId) mutate(["commentsByAuthor", created.authorId]);
                },
            }
        );

        return {
            createComment,
            isMutating,
            createError: error,
            createdData,
        };
    };

    const useCommentsByAuthor = (authorId: number | null) => {
        const key = authorId ? ["commentsByAuthor", authorId] as const : null;
        const { data, error, isLoading } = useSWR<Comment[]>(
            key,
            () => adapter.getCommentsByAuthor(authorId as number),
        );
        return {
            comments: data ?? [],
            isLoading,
            isError: error,
        };
    };

    // Return all hooks
    return {
        useComments,
        useComment,
        useCommentsByAuthor,
        useCreateComment,
        useCommentsByBuilding
    };
}
