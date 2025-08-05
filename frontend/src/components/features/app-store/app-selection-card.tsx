import React from "react";
import { Star, Download } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Badge } from "#/components/ui/badge";
import { cn } from "#/utils/utils";
import type { AppInfo } from "#/api/open-hands.types";
import {
  formatNumber,
  formatAppSize,
  getStoreDisplayName,
  type AppStore,
} from "#/api/app-store";

interface AppSelectionCardProps {
  app: AppInfo;
  store: AppStore;
  onCloneApp: (app: AppInfo) => void;
  className?: string;
}

export function AppSelectionCard({
  app,
  store,
  onCloneApp,
  className,
}: AppSelectionCardProps) {
  const storeDisplayName = getStoreDisplayName(store);
  const formattedRating = app.ratings.average.toFixed(1);
  const formattedRatingCount = formatNumber(app.ratings.total);
  const formattedAppSize = formatAppSize(app.appSize);

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200",
        className,
      )}
    >
      {/* App Header */}
      <div className="flex items-start gap-3 mb-3">
        {/* App Icon */}
        <div className="flex-shrink-0">
          <img
            src={app.icons.large}
            alt={`${app.name} icon`}
            className="w-16 h-16 rounded-xl shadow-sm"
            onError={(e) => {
              // Fallback to medium or small icon if large fails
              const target = e.target as HTMLImageElement;
              if (target.src === app.icons.large) {
                target.src = app.icons.medium;
              } else if (target.src === app.icons.medium) {
                target.src = app.icons.small;
              }
            }}
          />
        </div>

        {/* App Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight mb-1 truncate">
            {app.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 truncate">
            {app.developer.name}
          </p>

          {/* Rating and Price */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formattedRating}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({formattedRatingCount})
              </span>
            </div>

            <Badge variant="secondary" className="text-xs">
              {app.price.display}
            </Badge>
          </div>

          {/* Category and Content Rating */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">
              {app.category}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {app.contentRating}
            </Badge>
          </div>
        </div>
      </div>

      {/* App Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
        {app.description}
      </p>

      {/* App Details */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            <span>{formattedAppSize}</span>
          </div>
          <span>v{app.currentVersion}</span>
          <span>{storeDisplayName}</span>
        </div>
      </div>

      {/* Screenshots Preview */}
      {(app.screenshots.length > 0 || app.tabletScreenshots.length > 0) && (
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[...app.screenshots, ...app.tabletScreenshots]
              .slice(0, 4)
              .map((screenshot, index) => (
                <img
                  key={index}
                  src={screenshot}
                  alt={`${app.name} screenshot ${index + 1}`}
                  className="w-20 h-36 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-600"
                  onError={(e) => {
                    // Hide broken screenshot images
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              ))}
            {[...app.screenshots, ...app.tabletScreenshots].length > 4 && (
              <div className="w-20 h-36 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-gray-600">
                <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  +{[...app.screenshots, ...app.tabletScreenshots].length - 4}{" "}
                  more
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clone Button */}
      <Button
        onClick={() => onCloneApp(app)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        size="sm"
      >
        Clone This App
      </Button>
    </div>
  );
}
