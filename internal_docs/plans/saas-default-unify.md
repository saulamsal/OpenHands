Plan: Make SaaS Mode Default and Remove Mode Complexity                            │ │
│ │                                                                                    │ │
│ │ Overview                                                                           │ │
│ │                                                                                    │ │
│ │ Transform the entire application to make SaaS mode the default, eliminating the    │ │
│ │ need for OSS/SaaS mode switching throughout the frontend and backend.              │ │
│ │                                                                                    │ │
│ │ Backend Changes                                                                    │ │
│ │                                                                                    │ │
│ │ 1. Update Default Server Configuration                                             │ │
│ │                                                                                    │ │
│ │ - File: openhands/server/config/server_config.py                                   │ │
│ │ - Change default app_mode from AppMode.OSS to AppMode.SAAS                         │ │
│ │ - Update default storage classes to use database implementations                   │ │
│ │ - Enable SaaS features (billing, teams, etc.) by default                           │ │
│ │ - Update user authentication to use database auth by default                       │ │
│ │                                                                                    │ │
│ │ 2. Simplify Configuration Loading                                                  │ │
│ │                                                                                    │ │
│ │ - File: openhands/server/types.py                                                  │ │
│ │ - Keep AppMode enum but make SAAS the default expectation                          │ │
│ │ - Update ServerConfigInterface to reflect SaaS-first approach                      │ │
│ │                                                                                    │ │
│ │ 3. Remove Mode-Based Branching                                                     │ │
│ │                                                                                    │ │
│ │ - Search and update all backend files that check for APP_MODE                      │ │
│ │ - Remove conditional logic for OSS vs SaaS features                                │ │
│ │ - Make database storage the default expectation                                    │ │
│ │                                                                                    │ │
│ │ Frontend Changes                                                                   │ │
│ │                                                                                    │ │
│ │ 4. Simplify Settings Navigation                                                    │ │
│ │                                                                                    │ │
│ │ - File: frontend/src/routes/settings.tsx                                           │ │
│ │ - Remove SAAS_ONLY_PATHS array entirely                                            │ │
│ │ - Remove OSS_NAV_ITEMS and SAAS_NAV_ITEMS separation                               │ │
│ │ - Create single navigation array with all features                                 │ │
│ │ - Remove mode-based redirects and path restrictions                                │ │
│ │                                                                                    │ │
│ │ 5. Update Configuration Hook                                                       │ │
│ │                                                                                    │ │
│ │ - File: frontend/src/hooks/query/use-config.ts                                     │ │
│ │ - Simplify to always expect SaaS mode                                              │ │
│ │ - Remove fallback logic for OSS mode                                               │ │
│ │ - Always expect database authentication                                            │ │
│ │                                                                                    │ │
│ │ 6. Simplify Authentication Flow                                                    │ │
│ │                                                                                    │ │
│ │ - File: frontend/src/routes/root-layout.tsx                                        │ │
│ │ - Remove mode-based authentication branching                                       │ │
│ │ - Always use enhanced authentication components                                    │ │
│ │ - Remove OSS-specific auth logic                                                   │ │
│ │                                                                                    │ │
│ │ 7. Update API Types                                                                │ │
│ │                                                                                    │ │
│ │ - File: frontend/src/api/open-hands.types.ts                                       │ │
│ │ - Update GetConfigResponse to remove OSS mode option                               │ │
│ │ - Make SaaS features always available in types                                     │ │
│ │                                                                                    │ │
│ │ 8. Remove Conditional Rendering                                                    │ │
│ │                                                                                    │ │
│ │ - Update all components that check APP_MODE === "saas"                             │ │
│ │ - Remove conditional rendering for SaaS features                                   │ │
│ │ - Make teams, billing, user management always available                            │ │
│ │                                                                                    │ │
│ │ Component Updates                                                                  │ │
│ │                                                                                    │ │
│ │ 9. Sidebar Components                                                              │ │
│ │                                                                                    │ │
│ │ - Files:                                                                           │ │
│ │   - frontend/src/components/features/sidebar/sidebar.tsx                           │ │
│ │   - frontend/src/components/features/sidebar/enhanced-sidebar.tsx                  │ │
│ │ - Always use enhanced sidebar with SaaS features                                   │ │
│ │ - Remove mode-based component switching                                            │ │
│ │                                                                                    │ │
│ │ 10. Settings Pages                                                                 │ │
│ │                                                                                    │ │
│ │ - Files: All settings route files                                                  │ │
│ │ - Remove conditional rendering based on mode                                       │ │
│ │ - Always show full feature set                                                     │ │
│ │ - Update all settings hooks to not check for mode                                  │ │
│ │                                                                                    │ │
│ │ 11. Authentication Components                                                      │ │
│ │                                                                                    │ │
│ │ - Remove waitlist/basic auth components                                            │ │
│ │ - Always use enhanced authentication                                               │ │
│ │ - Remove mode-based auth component selection                                       │ │
│ │                                                                                    │ │
│ │ Test Updates                                                                       │ │
│ │                                                                                    │ │
│ │ 12. Update Test Files                                                              │ │
│ │                                                                                    │ │
│ │ - Update all 46 test files that reference mode switching                           │ │
│ │ - Remove mode-based test scenarios                                                 │ │
│ │ - Update mocks to always return SaaS configuration                                 │ │
│ │                                                                                    │ │
│ │ Configuration Files                                                                │ │
│ │                                                                                    │ │
│ │ 13. Environment Configuration                                                      │ │
│ │                                                                                    │ │
│ │ - Update default environment configurations                                        │ │
│ │ - Set database storage as default                                                  │ │
│ │ - Enable SaaS features by default in all environments                              │ │
│ │                                                                                    │ │
│ │ Deployment Changes                                                                 │ │
│ │                                                                                    │ │
│ │ 14. Update Build Scripts                                                           │ │
│ │                                                                                    │ │
│ │ - Remove OSS-specific build configurations                                         │ │
│ │ - Default to SaaS mode in all build processes                                      │ │
│ │ - Update deployment scripts to use database configuration                          │ │
│ │                                                                                    │ │
│ │ Migration Strategy                                                                 │ │
│ │                                                                                    │ │
│ │ 15. Backward Compatibility                                                         │ │
│ │                                                                                    │ │
│ │ - Provide clear migration path for existing OSS users                              │ │
│ │ - Document how to enable database storage                                          │ │
│ │ - Update documentation to reflect SaaS-first approach                              │ │
│ │                                                                                    │ │
│ │ Expected Benefits                                                                  │ │
│ │                                                                                    │ │
│ │ 1. Simplified Codebase: Remove ~200+ lines of conditional logic                    │ │
│ │ 2. Better Developer Experience: No more mode-switching complexity                  │ │
│ │ 3. Consistent Feature Set: All users get full SaaS features                        │ │
│ │ 4. Easier Maintenance: Single code path to maintain                                │ │
│ │ 5. Future-Proof: Built for SaaS-first architecture                                 │ │
│ │                                                                                    │ │
│ │ Files to Modify                                                                    │ │
│ │                                                                                    │ │
│ │ Backend (4 files):                                                                 │ │
│ │ - openhands/server/config/server_config.py                                         │ │
│ │ - openhands/server/types.py                                                        │ │
│ │ - openhands/server/mock/listen.py                                                  │ │
│ │ - tests/unit/test_mcp_routes.py                                                    │ │
│ │                                                                                    │ │
│ │ Frontend (42+ files):                                                              │ │
│ │ - All settings route files                                                         │ │
│ │ - All authentication components                                                    │ │
│ │ - All hooks that check APP_MODE                                                    │ │
│ │ - All test files                                                                   │ │
│ │ - API types and configurations                                                     │ │
│ │                                                                                    │ │
│ │ This plan will eliminate the need to worry about SAAS_ONLY_PATHS, mode switching,  │ │
│ │ and conditional rendering, making the entire application SaaS-first by default.
