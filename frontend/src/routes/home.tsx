import React from "react";
import { PrefetchPageLinks } from "react-router";
import { HomeHeader } from "#/components/features/home/home-header";
import { Route } from "./+types/home";
import { SidebarTrigger } from "#/components/ui/sidebar";
import { useIsMobile } from "#/hooks/use-mobile";

<PrefetchPageLinks page="/conversations/:conversationId" />;

export const clientLoader = async ({ request }: Route.ClientLoaderArgs) =>
  // Don't require authentication on the homepage - let users see the landing page
  // Authentication will be checked when they try to create a conversation
  null;

function HomeScreen() {
  const isMobile = useIsMobile();

  return (
    <div
      data-testid="home-screen"
      className=" h-full flex flex-col rounded-xl px-[42px] pt-[42px] gap-8 overflow-y-auto"
    >
      {/* Mobile hamburger menu */}
      {isMobile && (
        <div className="flex items-center justify-start mb-4 -mt-2">
          <SidebarTrigger className="" />
        </div>
      )}

      <HomeHeader />
    </div>
  );
}

export default HomeScreen;
