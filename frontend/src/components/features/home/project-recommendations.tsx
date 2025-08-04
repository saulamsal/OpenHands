import React from "react";
import { LuZap, LuChevronsUpDown } from "react-icons/lu";

import { IoLogoAppleAppstore } from "react-icons/io5";

// Category Icons
import { MdOutlineSportsBaseball } from "react-icons/md";
import { BiMoviePlay } from "react-icons/bi";
import {
  HiOutlineUsers,
  HiOutlineShoppingBag,
  HiOutlineViewGrid,
} from "react-icons/hi";
import { MdOutlineProductionQuantityLimits } from "react-icons/md";
import { TiWeatherPartlySunny } from "react-icons/ti";
import { MdOutlineAttachMoney } from "react-icons/md";
import { ProgressiveBlur } from "#/../components/motion-primitives/progressive-blur";
import { Dock, DockIcon, DockItem, DockLabel } from "#/../components/motion-primitives/dock";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/utils/utils";
import { Button } from "#/components/ui/button";

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  count: number;
}

interface ProjectRecommendation {
  id: string;
  title: string;
  description: string;
  image: string;
  categoryId: string;
}

interface Framework {
  key: string;
  label: string;
  icon: React.ReactElement;
  description: string;
  disabled?: boolean;
}

interface ProjectRecommendationsProps {
  selectedFramework?: string;
  frameworks?: Framework[];
  onFrameworkChange?: (frameworkKey: string) => void;
  onCreateProject?: (recommendation: ProjectRecommendation) => void;
  onCloneProject?: (projectName: string) => void;
}

const categories: Category[] = [
  {
    id: "all",
    name: "All",
    icon: HiOutlineViewGrid,
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    count: 43,
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: BiMoviePlay,
    color: "text-red-700",
    bgColor: "bg-red-100",
    count: 12,
  },
  {
    id: "social",
    name: "Social",
    icon: HiOutlineUsers,
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    count: 4,
  },
  {
    id: "productivity",
    name: "Productivity",
    icon: MdOutlineProductionQuantityLimits,
    color: "text-green-700",
    bgColor: "bg-green-100",
    count: 6,
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    icon: HiOutlineShoppingBag,
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    count: 6,
  },
  {
    id: "utility",
    name: "Utility",
    icon: TiWeatherPartlySunny,
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    count: 3,
  },
  {
    id: "finance",
    name: "Finance",
    icon: MdOutlineAttachMoney,
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    count: 2,
  },
  {
    id: "sports",
    name: "Sports",
    icon: MdOutlineSportsBaseball,
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    count: 4,
  },
];

const sampleRecommendations: ProjectRecommendation[] = [
  {
    id: "netflix-clone",
    title: "Netflix",
    description:
      "Create a streaming platform with video playback, user authentication, and content management",
    image: "https://i.imgur.com/yviJHBS_d.webp?maxwidth=760&fidelity=grand",
    categoryId: "entertainment",
  },
  {
    id: "airbnb-clone",
    title: "Airbnb",
    description:
      "Vacation rental marketplace with property listings, booking, and reviews",
    image: "https://i.imgur.com/P6eWCUt.jpeg",
    categoryId: "ecommerce",
  },

  {
    id: "cursor",
    title: "Cursor",
    description:
      "Integrate and explore powerful developer tools provided by Cursor for debugging, code navigation, and productivity enhancements",
    image: "https://i.imgur.com/027fMCf.png",
    categoryId: "productivity",
  },
  {
    id: "apple-tv-clone",
    title: "Apple TV",
    description:
      "Stream movies and TV shows with curated recommendations and personalized watchlists",
    image: "https://i.imgur.com/SPMiP5V_d.webp?maxwidth=760&fidelity=grand",
    categoryId: "entertainment",
  },
  {
    id: "x",
    title: "𝕏",
    description:
      "Build a microblogging platform with tweet posting, timelines, likes, and real-time updates",
    image: "https://i.imgur.com/8DVJCDP.png",
    categoryId: "social",
  },

  {
    id: "apple-music-clone",
    title: "Apple Music Clone",
    description:
      "Develop a music streaming app with playlists, search, and audio player functionality",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
    categoryId: "entertainment",
  },
  {
    id: "instagram-clone",
    title: "Instagram Clone",
    description:
      "Social media platform with photo sharing, stories, and real-time messaging",
    image:
      "https://images.unsplash.com/photo-1611262588024-d12430b98920?w=400&h=300&fit=crop",
    categoryId: "social",
  },
  {
    id: "todo-app",
    title: "Todo App Clone",
    description:
      "Task management application with categories, due dates, and progress tracking",
    image:
      "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop",
    categoryId: "productivity",
  },
  {
    id: "ecommerce-store",
    title: "E-commerce Store Clone",
    description:
      "Online shopping platform with cart, payments, and inventory management",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
    categoryId: "ecommerce",
  },
  {
    id: "weather-app",
    title: "Weather App Clone",
    description:
      "Weather forecasting app with location services and interactive maps",
    image:
      "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=400&h=300&fit=crop",
    categoryId: "utility",
  },
  {
    id: "trading-app",
    title: "Trading App Clone",
    description:
      "Financial trading platform with real-time charts, portfolio tracking, and market analysis",
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop",
    categoryId: "finance",
  },
  {
    id: "banking-app",
    title: "Banking App Clone",
    description:
      "Digital banking solution with account management, transfers, and financial insights",
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop",
    categoryId: "finance",
  },
  {
    id: "sports-tracker",
    title: "Sports Tracker Clone",
    description:
      "Fitness and sports tracking app with workout plans, progress monitoring, and social features",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
    categoryId: "sports",
  },
  {
    id: "fantasy-sports",
    title: "Fantasy Sports Clone",
    description:
      "Fantasy sports platform with team management, live scoring, and league competitions",
    image:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    categoryId: "sports",
  },
];

export function ProjectRecommendations({
  selectedFramework = "expo-router",
  frameworks = [],
  onFrameworkChange,
  onCreateProject,
  onCloneProject,
}: ProjectRecommendationsProps) {
  const [selectedCategoryId, setSelectedCategoryId] = React.useState("all");
  const currentFramework =
    frameworks.find((f) => f.key === selectedFramework) || frameworks[0];

  const filteredRecommendations =
    selectedCategoryId === "all"
      ? sampleRecommendations
      : sampleRecommendations.filter(
          (rec) => rec.categoryId === selectedCategoryId,
        );
  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4">
      <h2 className="text-4xl font-light tracking-tight">
        Don't know where to start?
      </h2>

      <div className="flex items-center justify-between">
        <div className="flex  gap-4 items-center">
          <div>
            <p className="text-muted-foreground text-lg">
              Try cloning some of these projects
            </p>
          </div>

          <p className="font-bold text-lg"> OR</p>

          <div>
            <Button className="rounded-full py-0 h-8 bg-transparent border border-[#1C93F6]">
              <p className="text-[#1C93F6]"> Find on App Store</p>
              <IoLogoAppleAppstore
                width={30}
                height={30}
                style={{ color: "#1C93F6" }}
              />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {frameworks.length > 0 && currentFramework && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-base font-medium tracking-tight px-4 py-2 border rounded-full hover:bg-gray-50">
                  <span className="text-foreground ">
                    {currentFramework.icon}
                  </span>
                  <span className="text-muted-foreground text-base tracking-tight">
                    {currentFramework.label}
                  </span>
                  <LuChevronsUpDown
                    className="h-5 w-5 opacity-5 text-muted-foreground text-xl"
                    width={20}
                    height={20}
                    style={{ color: "#C9B97433" }}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {frameworks.map((framework) => (
                  <DropdownMenuItem
                    key={framework.key}
                    onClick={() => onFrameworkChange?.(framework.key)}
                    disabled={framework.disabled}
                    className={
                      framework.disabled ? "opacity-60 cursor-not-allowed" : ""
                    }
                  >
                    <span className="text-muted-foreground">
                      {framework.icon}
                    </span>
                    <span className="ml-2">{framework.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Category Filter - Dock Style */}
      <div className="relative h-32 flex items-center justify-center ">
        <div className="absolute bottom-2 left-1/2 max-w-full -translate-x-1/2">
          <Dock className="items-end pb-3 ">
            {categories.map((category) => {
              const IconComponent = category.icon;
              const isSelected = selectedCategoryId === category.id;

              return (
                <DockItem
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={cn(
                    "aspect-square rounded-xl transition-all duration-200",
                    isSelected
                      ? "bg-primary border-2 border-primary"
                      : "bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700"
                  )}
                >
                  <DockLabel>
                    {category.name} ({category.count})
                  </DockLabel>
                  <DockIcon>
                    <IconComponent
                      className={cn(
                        "h-full w-full transition-colors",
                        isSelected
                          ? "text-white"
                          : "text-neutral-600 dark:text-neutral-300"
                      )}
                    />
                  </DockIcon>
                </DockItem>
              );
            })}
          </Dock>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredRecommendations.map((recommendation) => (
          <div
            key={recommendation.id}
            className="relative aspect-[2.5/4] overflow-hidden rounded-3xl cursor-pointer"
            onClick={() => {
              const cloneMessage = `clone ${recommendation.title.toLowerCase()}`;
              onCloneProject?.(cloneMessage);
            }}
          >
            {/* Background Image */}
            <img
              src={recommendation.image}
              alt={recommendation.title}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />

            {/* Progressive Blur Overlay */}
            <ProgressiveBlur
              className="pointer-events-none absolute bottom-0 left-0 h-[35%] w-full rounded-3xl"
              blurIntensity={6}
              direction="bottom"
            />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              <h3 className="text-xl font-bold text-white leading-tight">
                {recommendation.title}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-6">
        <Button variant="outline" className="gap-2 px-6 py-3 text-base">
          <LuZap className="h-5 w-5" />
          View More Templates
        </Button>
      </div>
    </div>
  );
}
