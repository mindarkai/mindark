import { CancelToken } from "@iyio/common";
import { ArkPackageCtrl } from "./ArkPackageCtrl";
import { RuntimeOrchestratorCtrl } from "./RuntimeOrchestratorCtrl";

export class RuntimeDefCtrl extends ArkPackageCtrl
{
    protected override onMount(m:CancelToken):void{
        super.onMount(m);
        if(this.model.runtimeDef && (this.parent instanceof RuntimeOrchestratorCtrl)){
            this.parent.deployAsync(this.model.runtimeDef,m);
        }
    }
}
