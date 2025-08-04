import React from "react";

export default function DebugTailwind() {
  // Color categories from your CSS theme
  const colorCategories = {
    "Base Colors": [
      {
        name: "background",
        class: "bg-background",
        textClass: "text-foreground",
      },
      {
        name: "foreground",
        class: "bg-foreground",
        textClass: "text-background",
      },
      { name: "base", class: "bg-base", textClass: "text-foreground" },
      {
        name: "base-secondary",
        class: "bg-base-secondary",
        textClass: "text-foreground",
      },
      {
        name: "base-tertiary",
        class: "bg-base-tertiary",
        textClass: "text-foreground",
      },
    ],
    "Card & Popover": [
      { name: "card", class: "bg-card", textClass: "text-card-foreground" },
      {
        name: "card-foreground",
        class: "bg-card-foreground",
        textClass: "text-card",
      },
      {
        name: "popover",
        class: "bg-popover",
        textClass: "text-popover-foreground",
      },
      {
        name: "popover-foreground",
        class: "bg-popover-foreground",
        textClass: "text-popover",
      },
    ],
    "Primary & Secondary": [
      {
        name: "primary",
        class: "bg-primary",
        textClass: "text-primary-foreground",
      },
      {
        name: "primary-foreground",
        class: "bg-primary-foreground",
        textClass: "text-primary",
      },
      {
        name: "secondary",
        class: "bg-secondary",
        textClass: "text-secondary-foreground",
      },
      {
        name: "secondary-foreground",
        class: "bg-secondary-foreground",
        textClass: "text-secondary",
      },
    ],
    "Muted & Accent": [
      { name: "muted", class: "bg-muted", textClass: "text-muted-foreground" },
      {
        name: "muted-foreground",
        class: "bg-muted-foreground",
        textClass: "text-muted",
      },
      {
        name: "accent",
        class: "bg-accent",
        textClass: "text-accent-foreground",
      },
      {
        name: "accent-foreground",
        class: "bg-accent-foreground",
        textClass: "text-accent",
      },
    ],
    Destructive: [
      {
        name: "destructive",
        class: "bg-destructive",
        textClass: "text-destructive-foreground",
      },
      {
        name: "destructive-foreground",
        class: "bg-destructive-foreground",
        textClass: "text-destructive",
      },
    ],
    "Border & Input": [
      { name: "border", class: "bg-border", textClass: "text-foreground" },
      { name: "input", class: "bg-input", textClass: "text-foreground" },
      { name: "ring", class: "bg-ring", textClass: "text-background" },
      { name: "tertiary", class: "bg-tertiary", textClass: "text-foreground" },
      {
        name: "tertiary-alt",
        class: "bg-tertiary-alt",
        textClass: "text-background",
      },
    ],
    "Chart Colors": [
      { name: "chart-1", class: "bg-chart-1", textClass: "text-white" },
      { name: "chart-2", class: "bg-chart-2", textClass: "text-white" },
      { name: "chart-3", class: "bg-chart-3", textClass: "text-black" },
      { name: "chart-4", class: "bg-chart-4", textClass: "text-white" },
      { name: "chart-5", class: "bg-chart-5", textClass: "text-white" },
    ],
    "Sidebar Colors": [
      {
        name: "sidebar",
        class: "bg-sidebar",
        textClass: "text-sidebar-foreground",
      },
      {
        name: "sidebar-foreground",
        class: "bg-sidebar-foreground",
        textClass: "text-sidebar",
      },
      {
        name: "sidebar-primary",
        class: "bg-sidebar-primary",
        textClass: "text-sidebar-primary-foreground",
      },
      {
        name: "sidebar-primary-foreground",
        class: "bg-sidebar-primary-foreground",
        textClass: "text-sidebar-primary",
      },
      {
        name: "sidebar-accent",
        class: "bg-sidebar-accent",
        textClass: "text-sidebar-accent-foreground",
      },
      {
        name: "sidebar-accent-foreground",
        class: "bg-sidebar-accent-foreground",
        textClass: "text-sidebar-accent",
      },
      {
        name: "sidebar-border",
        class: "bg-sidebar-border",
        textClass: "text-sidebar-foreground",
      },
      {
        name: "sidebar-ring",
        class: "bg-sidebar-ring",
        textClass: "text-sidebar-foreground",
      },
    ],
  };

  const borderRadiusOptions = [
    { name: "rounded-sm", class: "rounded-sm" },
    { name: "rounded", class: "rounded" },
    { name: "rounded-md", class: "rounded-md" },
    { name: "rounded-lg", class: "rounded-lg" },
    { name: "rounded-xl", class: "rounded-xl" },
    { name: "rounded-2xl", class: "rounded-2xl" },
    { name: "rounded-3xl", class: "rounded-3xl" },
    { name: "rounded-full", class: "rounded-full" },
  ];

  const shadowOptions = [
    { name: "shadow-2xs", class: "shadow-2xs" },
    { name: "shadow-xs", class: "shadow-xs" },
    { name: "shadow-sm", class: "shadow-sm" },
    { name: "shadow", class: "shadow" },
    { name: "shadow-md", class: "shadow-md" },
    { name: "shadow-lg", class: "shadow-lg" },
    { name: "shadow-xl", class: "shadow-xl" },
    { name: "shadow-2xl", class: "shadow-2xl" },
  ];

  const fontFamilies = [
    {
      name: "font-sans",
      class: "font-sans",
      text: "Host Grotesk Variable (Sans)",
    },
    { name: "font-serif", class: "font-serif", text: "UI Serif (Serif)" },
    { name: "font-mono", class: "font-mono", text: "UI Monospace (Mono)" },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            🎨 Tailwind CSS Debug Palette
          </h1>
          <p className="text-muted-foreground text-lg">
            Visual reference for all custom Tailwind colors, backgrounds, and
            styles from your theme
          </p>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Tip:</strong> This page shows both light and dark mode
              variants. Toggle your theme to see how colors adapt!
            </p>
          </div>
        </div>

        {/* Theme Toggle Demo */}
        <div className="mb-8 p-6 bg-card rounded-lg border">
          <h2 className="text-2xl font-semibold text-card-foreground mb-4">
            Theme Modes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-background border rounded-lg">
              <h3 className="font-medium text-foreground mb-2">
                Light Mode Preview
              </h3>
              <div className="space-y-2">
                <div className="h-4 bg-primary rounded" />
                <div className="h-4 bg-secondary rounded" />
                <div className="h-4 bg-accent rounded" />
              </div>
            </div>
            <div className="dark p-4 bg-background border rounded-lg">
              <h3 className="font-medium text-foreground mb-2">
                Dark Mode Preview
              </h3>
              <div className="space-y-2">
                <div className="h-4 bg-primary rounded" />
                <div className="h-4 bg-secondary rounded" />
                <div className="h-4 bg-accent rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Color Categories */}
        {Object.entries(colorCategories).map(([categoryName, colors]) => (
          <div key={categoryName} className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              {categoryName}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {colors.map((color) => (
                <div key={color.name} className="group">
                  <div
                    className={`${color.class} ${color.textClass} p-6 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer`}
                  >
                    <div className="font-medium text-sm mb-1">{color.name}</div>
                    <div className="text-xs opacity-75 font-mono">
                      {color.class}
                    </div>
                    <div className="text-xs opacity-75 font-mono">
                      {color.textClass}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Border Radius */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Border Radius
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {borderRadiusOptions.map((radius) => (
              <div key={radius.name} className="text-center">
                <div
                  className={`${radius.class} bg-primary h-16 w-16 mx-auto mb-2`}
                />
                <div className="text-sm font-mono text-muted-foreground">
                  {radius.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shadows */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Shadows
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
            {shadowOptions.map((shadow) => (
              <div key={shadow.name} className="text-center">
                <div
                  className={`${shadow.class} bg-card h-16 w-16 mx-auto mb-2 rounded-lg`}
                />
                <div className="text-sm font-mono text-muted-foreground">
                  {shadow.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Font Families */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Typography
          </h2>
          <div className="space-y-4">
            {fontFamilies.map((font) => (
              <div key={font.name} className="p-4 bg-card rounded-lg border">
                <div
                  className={`${font.class} text-xl text-card-foreground mb-2`}
                >
                  The quick brown fox jumps over the lazy dog
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-mono">{font.name}</span> - {font.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Examples */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Interactive Components
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Button Examples */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-medium text-card-foreground mb-4">Buttons</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
                  Primary Button
                </button>
                <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity">
                  Secondary Button
                </button>
                <button className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:opacity-90 transition-opacity">
                  Destructive Button
                </button>
                <button className="w-full px-4 py-2 border border-border text-foreground rounded-md hover:bg-accent transition-colors">
                  Outline Button
                </button>
              </div>
            </div>

            {/* Input Examples */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-medium text-card-foreground mb-4">
                Form Elements
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Input field"
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
                />
                <select className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground">
                  <option>Select option</option>
                  <option>Option 1</option>
                  <option>Option 2</option>
                </select>
                <textarea
                  placeholder="Textarea"
                  rows={3}
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Card Examples */}
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="font-medium text-card-foreground mb-4">
                Cards & Containers
              </h3>
              <div className="space-y-3">
                <div className="p-4 bg-muted rounded-md">
                  <div className="text-sm font-medium text-foreground">
                    Muted Container
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Subtle background
                  </div>
                </div>
                <div className="p-4 bg-accent rounded-md">
                  <div className="text-sm font-medium text-accent-foreground">
                    Accent Container
                  </div>
                  <div className="text-xs text-accent-foreground opacity-75">
                    Highlighted content
                  </div>
                </div>
                <div className="p-4 border border-border rounded-md">
                  <div className="text-sm font-medium text-foreground">
                    Bordered Container
                  </div>
                  <div className="text-xs text-muted-foreground">
                    With border styling
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CSS Variables Reference */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            CSS Variables Reference
          </h2>
          <div className="bg-card rounded-lg border p-6">
            <p className="text-card-foreground mb-4">
              All colors are defined using HSL values in CSS custom properties.
              Here are some key variables:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
              <div className="space-y-1">
                <div className="text-muted-foreground">Light Mode:</div>
                <div className="text-card-foreground">
                  --background: 48 33.3333% 97.0588%
                </div>
                <div className="text-card-foreground">
                  --primary: 20.9412 100% 50%
                </div>
                <div className="text-card-foreground">
                  --secondary: 46.1538 22.8070% 88.8235%
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Dark Mode:</div>
                <div className="text-card-foreground">
                  --background: 60 2.7027% 14.5098%
                </div>
                <div className="text-card-foreground">
                  --primary: 14.7692 63.1068% 59.6078%
                </div>
                <div className="text-card-foreground">
                  --secondary: 48 33.3333% 97.0588%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-muted-foreground text-sm">
            🎨 Debug Tailwind Palette - Built for easy color reference and theme
            debugging
          </p>
        </div>
      </div>
    </div>
  );
}
