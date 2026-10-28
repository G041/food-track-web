import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type NewRestaurant, type ReviewDecision } from '@/lib/api';

export function useApprovedRestaurants() {
  return useQuery({ queryKey: ['restaurants', 'approved'], queryFn: api.listApproved });
}

export function useMySubmissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['restaurants', 'mine', userId],
    queryFn: () => api.listMine(userId!),
    enabled: !!userId,
  });
}

export function usePendingRestaurants(enabled: boolean) {
  return useQuery({ queryKey: ['restaurants', 'pending'], queryFn: api.listPending, enabled });
}

function useInvalidateRestaurants() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };
}

export function useSubmitRestaurant() {
  const onSuccess = useInvalidateRestaurants();
  return useMutation({ mutationFn: (input: NewRestaurant) => api.submit(input), onSuccess });
}

export function useWithdrawRestaurant() {
  const onSuccess = useInvalidateRestaurants();
  return useMutation({ mutationFn: (id: number) => api.withdraw(id), onSuccess });
}

export function useAdminNotes(enabled: boolean) {
  return useQuery({ queryKey: ['admin-notes'], queryFn: api.listNotes, enabled });
}

function useNotesMutation<T>(fn: (v: T) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-notes'] }),
  });
}

export const useAddNote = () => useNotesMutation((body: string) => api.addNote(body));
export const useSetNoteDone = () => useNotesMutation((v: { id: number; done: boolean }) => api.setNoteDone(v.id, v.done));
export const useDeleteNote = () => useNotesMutation((id: number) => api.deleteNote(id));

export function useReviewRestaurant() {
  const onSuccess = useInvalidateRestaurants();
  return useMutation({
    mutationFn: (v: { id: number; decision: ReviewDecision; note?: string }) =>
      api.review(v.id, v.decision, v.note),
    onSuccess,
  });
}
