import { CancelToken } from "@iyio/common";
import { ArkPackageCtrl } from "./ArkPackageCtrl";
import { ArkRuntimeDef } from "./mindark-types";

export class RuntimeOrchestratorCtrl extends ArkPackageCtrl
{
    public async deployAsync(def:ArkRuntimeDef,cancel?:CancelToken){
        console.log('hio 👋 👋 👋 DEPLOY',def);
    }
}
