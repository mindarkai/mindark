import { ArkPackageCtrl, ArkPackageCtrlOptions } from "./ArkPackageCtrl";

export interface ArkShellCtrlOptions extends ArkPackageCtrlOptions
{
    controllerPath:string;
    controllerArgs?:string[];
}

export class ArkShellCtrl extends ArkPackageCtrl
{
    public constructor({
        controllerPath,
        controllerArgs,
        ...options
    }:ArkShellCtrlOptions){
        super(options);
    }
}
