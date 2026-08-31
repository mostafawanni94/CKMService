'use client';

import { ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LanguageProvider } from '@/lib/i18n';

/**
 * Application providers.
 *
 * `@tanstack/react-query` was a declared dependency that nothing imported, so
 * every page hand-rolled its own loading/error/refetch state. It is wired up
 * here; hooks can adopt `useQuery` incrementally, and the existing
 * `useFetch`/`useMutation` helpers keep working untouched in the meantime.
 */
export function Providers({ children }: { children: ReactNode }) {
    // Created inside the component so each browser session gets its own cache
    // and no state is shared across requests during SSR.
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        refetchOnWindowFocus: false,
                        // A 401 is handled by the api client's refresh, and a
                        // 403 will never succeed on retry.
                        retry: 1,
                    },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <LanguageProvider>{children}</LanguageProvider>
        </QueryClientProvider>
    );
}
