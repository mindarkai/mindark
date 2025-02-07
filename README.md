## Package loading 

- Look for a custom package loader with type that matches package extension
  - If no match use default loader

- Custom Package loader
  - Execute logic of custom loader
- Default loader
  - look for a ark-loader.js file
  - If found read contents of the file and execute the exported loadPackageAsync function

- Find package loader
- Create package controller using package loader

## Package Lifecycle methods
- init - initializes the package and preforms any work with side effects. Package controllers can
also use their constructor for initializes but should to preform any actions with side effects.
- dispose - Disposes of the package and all its resources

![Diagram](docs/ArkRuntime.excalidraw.svg)
