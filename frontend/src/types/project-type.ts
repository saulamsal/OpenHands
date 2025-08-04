/**
 * Enum for supported project types
 * Add new project types here as needed
 */
export enum ProjectType {
  UNKNOWN = "UNKNOWN",
  EXPO = "EXPO",
  NEXTJS = "NEXTJS",
  LARAVEL = "LARAVEL",
  REACT = "REACT",
  VUE = "VUE",
  ANGULAR = "ANGULAR",
  DJANGO = "DJANGO",
  RAILS = "RAILS",
  NODE = "NODE",
  PYTHON = "PYTHON",
}

/**
 * Project type detection configuration
 */
export interface ProjectDetectionConfig {
  type: ProjectType;
  name: string;
  icon?: string;
  color?: string;
  detectors: ProjectDetector[];
}

/**
 * Individual detector for a project type
 */
export interface ProjectDetector {
  type: "file" | "dependency" | "devDependency" | "fileContent";
  pattern: string | RegExp;
  path?: string; // For file content checks
  weight?: number; // Higher weight = stronger indicator (default: 1)
}

/**
 * Result of project detection
 */
export interface ProjectDetectionResult {
  type: ProjectType;
  confidence: number; // 0-100
  detectedFeatures: string[];
}

/**
 * Tab configuration for project-specific tabs
 */
export interface ProjectSpecificTab {
  id: string;
  label: string;
  icon?: React.ComponentType;
  component: React.ComponentType<any>;
  projectTypes: ProjectType[];
  enabled?: (conversation: any) => boolean;
}
