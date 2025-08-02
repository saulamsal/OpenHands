import React from "react";
import { PrefetchPageLinks } from "react-router";
import { HomeHeader } from "#/components/features/home/home-header";
import { RepoConnector } from "#/components/features/home/repo-connector";
import { TaskSuggestions } from "#/components/features/home/tasks/task-suggestions";
import { useUserProviders } from "#/hooks/use-user-providers";
import { GitRepository } from "#/types/git";
import { Route } from "./+types/home";
import { requireAuth } from "#/utils/auth.client";

<PrefetchPageLinks page="/conversations/:conversationId" />;

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) => {
  // Always require authentication (database is the only mode)
  await requireAuth(request);

  return null;
};

function HomeScreen() {
  const { providers } = useUserProviders();
  const [selectedRepo, setSelectedRepo] = React.useState<GitRepository | null>(
    null,
  );

  const providersAreSet = providers.length > 0;

  return (
    <div
      data-testid="home-screen"
      className=" h-full flex flex-col rounded-xl px-[42px] pt-[42px] gap-8 overflow-y-auto"
    >
      <HomeHeader />

      <hr className="border" />

      <main className="flex flex-col lg:flex-row justify-between gap-8">
        <RepoConnector onRepoSelection={(repo) => setSelectedRepo(repo)} />
        <hr className="md:hidden border" />
        {providersAreSet && <TaskSuggestions filterFor={selectedRepo} />}
      </main>
    </div>
  );
}

export default HomeScreen;
