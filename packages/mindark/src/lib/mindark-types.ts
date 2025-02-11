import { VfsItem } from "@iyio/vfs";
import type { ArkPackageCtrl, ArkPackageCtrlOptions } from "./ArkPackageCtrl";

export interface ArkPackage
{
    /**
     * Globally unique id of te package. A package id can be made stable between loads by defining
     * a ark-pkg.json file and setting its id. If not defined in the package file of a package an id
     * will be generated.
     */
    id:string;

    /**
     *
     * A packages type is always determined by the packages file extension. The type defined in
     * ark-pkg.json files will be overwritten at load time but can still be helpful for debugging.
     */
    type:string;
    name:string;
    isModule:boolean;
    description?:string;
    author?:string;
    data?:Record<string,any>;
    path:string;
    vfsItem?:VfsItem;
    children?:ArkPackage[];
    controllers?:ArkPackageCtrlRef[];
    tags?:string[];
}

export interface EchoConfig
{

}


export interface ArkRuntimeConfig
{
    /**
     * Prefixed used to create URLs for a runtime. UrlPrefix should include a protocol and any
     * application specific path prefix.
     */
    urlPrefix?:string;

    /**
     * Path to a local directory to use as a tmp dir.
     */
    tmpDir?:string;
}

export interface EchoId{

    id:string;

    /**
     * Has of echo archive
     */
    hash?:string;

    /**
     * URL to echo archive
     */
    url?:string;
}

/**
 * Provides references to a package controller
 */
export interface ArkPackageCtrlRef
{
    type:string;

    /**
     * Path to a controller file
     */
    controllerPath?:string;

    /**
     * Used by controller referencing using the stdio interface type. controllerArgs are passed
     * to the controller file as args when the controller process is spawned.
     */
    controllerArgs?:string[];

    /**
     * Defaults to "direct" when the controllerPath points to a .js file.
     */
    interfaceType?:ArkControllerInterfaceType;

    controllerClass?:new (options:ArkPackageCtrlOptions)=>ArkPackageCtrl;

    createController?(options:ArkPackageCtrlOptions):ArkPackageCtrl;


}

/**
 * The interface type of a ark controller determines how a controller communicates with it's
 * hosting runtime controller.
 *
 * - direct - Used with controller references that directly define a controllerClass or point to a
 *   javascript controller file. Controller methods will be directly invoked on the controller class.
 *   Javascript controller files should export a named export named arkControllerClass that points
 *   to a ArkPackageCtrl class.
 *
 * - stdio - Used with controller references that point to non JavaScript files. The path pointed
 *   to by the controllerPath of a controller reference will be spawned on the VFS and will be
 *   communicated with using stdio via the the ArkShellCtrl class. Messages passed between the
 *   runtime and the spawned process will follow the Ark Message Protocol using the stdio
 *   transport type.
 */
export type ArkControllerInterfaceType='direct'|'stdio';

export type ArkMessageTransportType='http'|'stdio'|'humanChat';

export interface ArkMessage
{
    id:string;
    type:string;

    /**
     * From URL
     */
    from?:string;

    /**
     * To URL
     */
    to:string;

    payload?:any;
}

export interface ArkMessageDelivery
{
    to:ArkUrl;
    message:ArkMessage;
    /**
     * The current path index of the path array of the to property.
     */
    pathIndex?:number;
    onDelivered?(pkg:ArkPackageCtrl):void;
    onDeliveryFailed?(failedAt:ArkPackageCtrl):void;
}

export type ArkPathPartType='tag'|'id'|'name';
export interface ArkPathPart{
    type:ArkPathPartType;
    value:string;
}
export interface ArkUrl
{
    protocol:string;
    name:string;
    path:ArkPathPart[];
    isRelative:boolean;
    url:string;
}


/**
 * Defines the system properties and location of resources of a Runtime. ArkRuntimeDef are used
 * runtime orchestrators to create and deploy runtimes.
 */
export interface RuntimeDefConfig
{
    /**
     * Path on the VFS to a package
     */
    packagePath:string;

    /**
     * Path to a docker file. Relative paths are relative to the `packagePath` property
     */
    dockerFilePath?:string;

    /**
     * The context path that is used to build the docker image. The default value is the parent
     * directory of `dockerFilePath` or the value of `packagePath` if `dockerFilePath` is not
     * defined
     */
    dockerContextPath?:string;

    sourceMode?:RuntimeDefSourceMode;

    /**
     * Path in the created container that the source package content will be copied or mounted to.
     * @default "/ark-package"
     */
    containerSourcePath?:string;

    /**
     * Desired CPU core count
     */
    cpuCount?:number;

    memoryMb?:number;

    /**
     * Name of the network to connect the container to.
     * @default "ark-default"
     */
    network?:string;

    arch?:RuntimeDefArch;

    /**
     * Additional build args to pass with building docker file
     */
    dockerBuildArgs?:string[];

    /**
     * Additional docker build args
     */
    dockerRunArgs?:string[];

    env?:Record<string,string|RuntimeDefEnvSource>;

    ports?:RuntimeDefPortMapping[];

    volumes?:RuntimeDefVolumeMapping[];
}

export interface RuntimeDefEnvSource{
    /**
     * Name of local env var to use. Defaults to the key of the env var.
     */
    local?:string;
}

export interface RuntimeDefPortMapping
{
    /**
     * Internal port in container
     */
    i?:number;

    /**
     * External exposed port
     */
    o?:number;
}

export interface RuntimeDefVolumeMapping
{
    /**
     * Host source
     */
    src:string;

    /**
     * Container mount path
     */
    mount:string;
}

export type RuntimeDefArch='amd64'|'arm64';

export type RuntimeDefSourceMode='mount'|'copy'

export interface RuntimeOrchestratorConfig
{
    /**
     * The underlying container engine the orchestrator will use.
     */
    engine?:RuntimeOrchestratorEngine;

    /**
     * Max number of concurrent image builds
     */
    maxConcurrentBuilds?:number;


}

export type RuntimeOrchestratorEngine='podman'|'docker'|'kubernetes'
