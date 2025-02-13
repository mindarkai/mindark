import { CancelToken } from "@iyio/common";
import { ArkPackageCtrl } from "./ArkPackageCtrl";
import { OrchestratorCtrl } from "./OrchestratorCtrl";
import { RuntimeDefConfigScheme } from "./mindark-schemes";
import { RuntimeDefConfig } from "./mindark-types";

export class RuntimeDefCtrl extends ArkPackageCtrl<RuntimeDefConfig>
{

    protected override _configScheme=RuntimeDefConfigScheme;

    protected override onMount(m:CancelToken):void{
        super.onMount(m);
        const config=this.getConfig();
        if(config && (this.parent instanceof OrchestratorCtrl)){
            this.parent.runDeployAsync(config,this.parent.path,m);
        }
    }
}
