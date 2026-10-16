# Third-party notices

Application dependencies are installed from the npm registry with exact versions and integrity hashes in `package-lock.json`. Redistributors must retain the corresponding license/copyright notices from installed package directories, including transitive production dependencies.

| Package | License | Source |
| --- | --- | --- |
| React / React DOM 19.3.0; scheduler 0.28.0 | MIT | https://github.com/facebook/react |
| Papa Parse 5.7.0 | MIT | https://github.com/mholt/PapaParse |
| big.js 7.0.1 | MIT | https://github.com/MikeMcl/big.js |
| Zod 4.6.7 | MIT | https://github.com/colinhacks/zod |

Development tools (not runtime data-processing services): Vite (MIT), Vitest (MIT), TypeScript (Apache-2.0), ESLint/typescript-eslint (MIT), Playwright (Apache-2.0), axe-core (MPL-2.0) and their package-specific transitive licenses. The production license texts are included in `third-party-licenses/`; installed package license files are authoritative. The U1 isolated SheetJS qualification retains its separate dependencies; no SheetJS code is bundled in U2.
