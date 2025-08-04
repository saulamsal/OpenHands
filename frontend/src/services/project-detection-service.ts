import {
  ProjectType,
  ProjectDetectionConfig,
  ProjectDetectionResult,
} from "#/types/project-type";

/**
 * Project detection configurations
 * Add new project types and their detection rules here
 */
const PROJECT_DETECTION_CONFIGS: ProjectDetectionConfig[] = [
  {
    type: ProjectType.EXPO,
    name: "Expo",
    detectors: [
      { type: "file", pattern: "app.json", weight: 3 },
      { type: "file", pattern: "app.config.js", weight: 3 },
      { type: "file", pattern: "app.config.ts", weight: 3 },
      { type: "file", pattern: "eas.json", weight: 5 },
      { type: "dependency", pattern: "expo", weight: 5 },
      { type: "devDependency", pattern: "expo", weight: 3 },
      {
        type: "fileContent",
        pattern: /"expo":\s*{/,
        path: "app.json",
        weight: 5,
      },
    ],
  },
  {
    type: ProjectType.NEXTJS,
    name: "Next.js",
    detectors: [
      { type: "file", pattern: "next.config.js", weight: 5 },
      { type: "file", pattern: "next.config.ts", weight: 5 },
      { type: "file", pattern: "next.config.mjs", weight: 5 },
      { type: "dependency", pattern: "next", weight: 5 },
      { type: "devDependency", pattern: "next", weight: 3 },
      { type: "file", pattern: "pages", weight: 2 },
      { type: "file", pattern: "app", weight: 2 },
    ],
  },
  {
    type: ProjectType.LARAVEL,
    name: "Laravel",
    detectors: [
      { type: "file", pattern: "artisan", weight: 5 },
      { type: "file", pattern: "composer.json", weight: 2 },
      {
        type: "fileContent",
        pattern: /"laravel\/framework"/,
        path: "composer.json",
        weight: 5,
      },
      { type: "file", pattern: "routes/web.php", weight: 3 },
      { type: "file", pattern: "app/Http/Kernel.php", weight: 3 },
      { type: "file", pattern: ".env.example", weight: 1 },
    ],
  },
  {
    type: ProjectType.REACT,
    name: "React",
    detectors: [
      { type: "dependency", pattern: "react", weight: 3 },
      { type: "dependency", pattern: "react-dom", weight: 3 },
      { type: "file", pattern: "src/App.js", weight: 2 },
      { type: "file", pattern: "src/App.jsx", weight: 2 },
      { type: "file", pattern: "src/App.tsx", weight: 2 },
    ],
  },
  {
    type: ProjectType.VUE,
    name: "Vue",
    detectors: [
      { type: "dependency", pattern: "vue", weight: 5 },
      { type: "file", pattern: "vue.config.js", weight: 4 },
      { type: "file", pattern: "src/App.vue", weight: 3 },
      { type: "file", pattern: "src/main.js", weight: 2 },
    ],
  },
  {
    type: ProjectType.ANGULAR,
    name: "Angular",
    detectors: [
      { type: "file", pattern: "angular.json", weight: 5 },
      { type: "dependency", pattern: "@angular/core", weight: 5 },
      { type: "file", pattern: "src/app/app.module.ts", weight: 3 },
      { type: "file", pattern: "karma.conf.js", weight: 2 },
    ],
  },
  {
    type: ProjectType.DJANGO,
    name: "Django",
    detectors: [
      { type: "file", pattern: "manage.py", weight: 5 },
      { type: "file", pattern: "requirements.txt", weight: 1 },
      {
        type: "fileContent",
        pattern: /django/i,
        path: "requirements.txt",
        weight: 4,
      },
      { type: "file", pattern: "settings.py", weight: 3 },
      { type: "file", pattern: "urls.py", weight: 3 },
    ],
  },
  {
    type: ProjectType.RAILS,
    name: "Ruby on Rails",
    detectors: [
      { type: "file", pattern: "Gemfile", weight: 2 },
      {
        type: "fileContent",
        pattern: /gem\s+['"]rails['"]/,
        path: "Gemfile",
        weight: 5,
      },
      { type: "file", pattern: "config/routes.rb", weight: 4 },
      {
        type: "file",
        pattern: "app/controllers/application_controller.rb",
        weight: 4,
      },
      { type: "file", pattern: "Rakefile", weight: 2 },
    ],
  },
  {
    type: ProjectType.NODE,
    name: "Node.js",
    detectors: [
      { type: "file", pattern: "package.json", weight: 1 },
      { type: "file", pattern: "server.js", weight: 2 },
      { type: "file", pattern: "app.js", weight: 2 },
      { type: "file", pattern: "index.js", weight: 1 },
    ],
  },
  {
    type: ProjectType.PYTHON,
    name: "Python",
    detectors: [
      { type: "file", pattern: "requirements.txt", weight: 2 },
      { type: "file", pattern: "setup.py", weight: 3 },
      { type: "file", pattern: "pyproject.toml", weight: 3 },
      { type: "file", pattern: "Pipfile", weight: 3 },
    ],
  },
];

/**
 * Project detection service
 */
export class ProjectDetectionService {
  /**
   * Detect project type based on files in the workspace
   */
  static async detectProjectType(
    checkFile: (path: string) => Promise<boolean>,
    readFile: (path: string) => Promise<string | null>,
  ): Promise<ProjectDetectionResult> {
    const results: Map<ProjectType, number> = new Map();
    const detectedFeatures: Map<ProjectType, string[]> = new Map();

    // Check package.json first for dependencies
    let packageJsonContent: any = null;
    try {
      const packageJsonStr = await readFile("package.json");
      if (packageJsonStr) {
        packageJsonContent = JSON.parse(packageJsonStr);
      }
    } catch (error) {
      // Package.json might not exist or be invalid
    }

    // Check composer.json for PHP projects
    let composerJsonContent: any = null;
    try {
      const composerJsonStr = await readFile("composer.json");
      if (composerJsonStr) {
        composerJsonContent = JSON.parse(composerJsonStr);
      }
    } catch (error) {
      // composer.json might not exist or be invalid
    }

    // Run all detectors
    for (const config of PROJECT_DETECTION_CONFIGS) {
      let score = 0;
      const features: string[] = [];

      for (const detector of config.detectors) {
        const weight = detector.weight || 1;
        let detected = false;

        switch (detector.type) {
          case "file":
            if (await checkFile(detector.pattern)) {
              detected = true;
              features.push(`File: ${detector.pattern}`);
            }
            break;

          case "dependency":
            if (packageJsonContent?.dependencies?.[detector.pattern]) {
              detected = true;
              features.push(`Dependency: ${detector.pattern}`);
            }
            break;

          case "devDependency":
            if (packageJsonContent?.devDependencies?.[detector.pattern]) {
              detected = true;
              features.push(`Dev dependency: ${detector.pattern}`);
            }
            break;

          case "fileContent":
            if (detector.path) {
              const content = await readFile(detector.path);
              if (content && detector.pattern instanceof RegExp) {
                if (detector.pattern.test(content)) {
                  detected = true;
                  features.push(`Pattern in ${detector.path}`);
                }
              } else if (content && typeof detector.pattern === "string") {
                if (content.includes(detector.pattern)) {
                  detected = true;
                  features.push(`Pattern in ${detector.path}`);
                }
              }
            }
            break;
        }

        if (detected) {
          score += weight;
        }
      }

      if (score > 0) {
        results.set(config.type, score);
        detectedFeatures.set(config.type, features);
      }
    }

    // Find the best match
    let bestType = ProjectType.UNKNOWN;
    let bestScore = 0;
    let totalScore = 0;

    results.forEach((score, type) => {
      totalScore += score;
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    });

    // Calculate confidence
    const confidence =
      totalScore > 0 ? Math.min(100, (bestScore / totalScore) * 100) : 0;

    return {
      type: bestType,
      confidence: Math.round(confidence),
      detectedFeatures: detectedFeatures.get(bestType) || [],
    };
  }

  /**
   * Get project configuration by type
   */
  static getProjectConfig(
    type: ProjectType,
  ): ProjectDetectionConfig | undefined {
    return PROJECT_DETECTION_CONFIGS.find((config) => config.type === type);
  }

  /**
   * Check if a project type supports a specific feature
   */
  static supportsFeature(type: ProjectType, feature: string): boolean {
    // Define feature support matrix here
    const featureSupport: Record<string, ProjectType[]> = {
      atlas: [ProjectType.EXPO],
      telescope: [ProjectType.LARAVEL],
      devtools: [ProjectType.NEXTJS, ProjectType.REACT, ProjectType.VUE],
    };

    return featureSupport[feature]?.includes(type) || false;
  }
}
