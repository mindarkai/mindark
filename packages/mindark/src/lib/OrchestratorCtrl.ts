import { CancelToken, Lock, delayAsync } from "@iyio/common";
import { ArkPackageCtrl, ArkPackageCtrlOptions } from "./ArkPackageCtrl";
import { ContainerDeployment } from "./ContainerDeployment";
import { RuntimeOrchestratorConfigScheme } from "./mindark-schemes";
import { RuntimeDefConfig, RuntimeOrchestratorConfig, RuntimeOrchestratorEngine } from "./mindark-types";

export class OrchestratorCtrl extends ArkPackageCtrl<RuntimeOrchestratorConfig>
{

    public static readonly defaultUpdateDelayMs=2500;

    public static readonly defaultEngine:RuntimeOrchestratorEngine='docker';

    protected override _configScheme=RuntimeOrchestratorConfigScheme;

    public readonly buildLock:Lock;

    public constructor(options:ArkPackageCtrlOptions){
        super(options);
        this.buildLock=new Lock(this.getConfig()?.maxConcurrentBuilds??8);// todo - use number of cpus
    }

    protected override onDispose():void{
        super.onDispose();
        this._updateCancel?.cancelNow();
        const deployments=[...this.deployments];
        for(const d of deployments){
            d.dispose();
        }
    }

    protected override onUnmount():void{
        super.onUnmount();
        this._updateCancel?.cancelNow();
    }


    private readonly deployments:ContainerDeployment[]=[];

    public addDeployment(def:RuntimeDefConfig,workingDir:string):ContainerDeployment|undefined
    {
        if(this.isDisposed){
            return undefined;
        }
        const ctrl=this.selectByPath(def.packagePath);
        if(!ctrl){
            return undefined;
        }
        const deployment=new ContainerDeployment(def,ctrl,workingDir,this);
        this.deployments.push(deployment);
        this.queueUpdate();
        return deployment;
    }

    public async runDeployAsync(def:RuntimeDefConfig,workingDir:string,cancel?:CancelToken):Promise<ContainerDeployment|undefined>
    {

        const deployment=this.addDeployment(def,workingDir);
        if(!deployment){
            return undefined;
        }

        cancel?.removeListener(()=>{
            deployment.dispose();
        })

        await deployment.lifetimePromise;

        return deployment;
    }


    public queueUpdate(delayMs=2500)
    {
        this.updateDeploymentsAsync(delayMs)
    }

    private _updateCancel?:CancelToken;
    private async updateDeploymentsAsync(delayMs=2500)
    {
        const oldCancel=this._updateCancel;
        if(oldCancel){
            this._updateCancel=undefined;
            oldCancel.cancelNow();
        }
        const cancel=new CancelToken();
        this._updateCancel=cancel;

        if(delayMs>0){
            await delayAsync(delayMs);
            if(cancel.isCanceled){
                return;
            }
        }

        const builds=await Promise.all(this.deployments.map(async d=>{

            const tag=await d.buildImageAsync(cancel);
            if(!tag){
                cancel.cancelNow();
            }

            return {
                tag,
                deployment:d,
            }
        }));

        if(cancel.isCanceled){
            return;
        }

        await Promise.all(builds.map(async b=>{
            if(b.tag){
                await b.deployment.runAsync(cancel);
            }
        }));


    }
}
