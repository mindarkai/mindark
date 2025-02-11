export const arkPackageFilename='ark-pkg.json';

export const echoPackageExt='.ark-echo';

export const arkControllerClassExportName='arkControllerClass';

export const mindarkUrlProtocol='mindark';

export const arkPackageUrlProtocol='pkg';

export const commonArkPackageTypes={
    runtime:'runtime',
    runtimeDef:'runtimeDef',
    orchestrator:'orchestrator',
    db:'db',
    echo:'echo',
    history:'history',
    inference:'inference',
    interface:'interface',
    lattice:'lattice',
    pulse:'pulse',
} as const;

export const arkSelfPackagePath='.';
export const arkParentPackagePath='..';

/**
 * Name of the subdirectory within a package used by the runtime for writing runtime related files.
 * .ark-runtime is ignored when creating package archives
 */
export const arkInPackageRuntimeDir='.ark-runtime';

/**
 * Name of temp directory within a package
 */
export const arkInPackageTmpDir=arkInPackageRuntimeDir+'/tmp'
