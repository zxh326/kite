# Changes and Improvements (November 1-6, 2025)

1. Add Rollback Confirmation Dialog - new dialog component with revision number and release name input fields
2. Add Suspend Confirmation Dialog - new dialog component for FluxCD suspend operations with pre-filled fields
3. Add Resume Confirmation Dialog - new dialog component for FluxCD resume operations with pre-filled fields
4. Add Scale Confirmation Dialog - new dialog component for scaling deployments
5. Add Restart Confirmation Dialog - new dialog component for restarting deployments
6. Add YAML Save Confirmation Dialog - new dialog component for confirming YAML edits
7. Fix Rollback Operation - async race condition causing rollback to not trigger properly
8. Fix Suspend FluxCD Operation - async race condition preventing suspend from executing
9. Fix Resume FluxCD Operation - async race condition preventing resume from executing
10. Fix Resource History Pagination - Next/Previous buttons not working with server-side pagination
11. Add Server-Side Pagination Support - SimpleTable component now supports API total count
12. Add Rollback RBAC Permission - new 'rollback' verb for fine-grained access control
13. Add Suspend/Resume RBAC Permissions - new verbs for FluxCD operations
14. Add HelmRelease Handler - backend support for FluxCD HelmRelease operations
15. Add Pre-filled Form Fields - auto-populate deployment/release names in all dialogs
16. Add Badge Variants - new badge colors for different operation types (success, warning, info, orange)
17. Improve Resource History UI - better operation type labels and color coding
18. Improve Deployment Detail Page - added Rollback, Suspend, Resume buttons to action bar
19. Improve RBAC Configuration - updated documentation for new rollback/suspend/resume verbs
20. Improve i18n Translations - added English and Chinese translations for new features
21. Update API Types - added ResourceHistoryResponse with pagination support
22. Update RBAC Middleware - support for new deployment operation verbs
23. Update Documentation - resource history guide and RBAC configuration
24. Fix SimpleTable Pagination Display - now shows correct total count from API
