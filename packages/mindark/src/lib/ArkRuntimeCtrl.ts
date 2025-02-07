import { IifeModuleResult, Log, ReadonlySubject, createIifeModule, createLog, dupDeleteUndefined, joinPaths, pushBehaviorSubjectAry, shortUuid } from '@iyio/common';
import { VfsCtrl, VfsItem, vfs } from '@iyio/vfs';
import { BehaviorSubject } from 'rxjs';
import { ArkPackageCtrl, ArkPackageCtrlOptions } from './ArkPackageCtrl';
import { ArkShellCtrl } from './ArkShellCtrl';
import { arkControllerClassExportName, arkPackageFilename } from './mindark-const';
import { arkPackageFromVfsItem, getArkControllerInterfaceTypeByPath, isValidArkPackageCtrlRef, mergeArkPackages } from './mindark-lib';
import { ArkPackage, ArkPackageCtrlRef, ArkRuntime } from './mindark-types';
import { getStdArkPackageCtrlRefAsync } from './std-ark-package-refs';

export interface ArkRuntimeCtrlOptions
{
    id?:string;
    name?:string;
    vfs?:VfsCtrl;
    model?:Partial<ArkRuntime>;
}

export class ArkRuntimeCtrl extends ArkPackageCtrl<ArkRuntime>
{

    public readonly log:Log;
    public readonly vfs:VfsCtrl;

    public readonly urlPrefix?:string;



    public constructor({
        model,
        id=model?.id??shortUuid(),
        name=model?.name??'default-ark-runtime',
        vfs:_vfs=vfs(),
    }:ArkRuntimeCtrlOptions={}){
        super({
            runtime:'self',
            model:{
                id,
                isModule:true,
                name:'runtime-root',
                path:'/',
                description:'Root of the current ARK runtime',
                children:[],
                ...dupDeleteUndefined(model),
                type:'runtime',
            }

        });
        this.urlPrefix=model?.urlPrefix;
        this.log=createLog(name);
        this.vfs=_vfs;
    }

    public async loadPackageAsync(item:VfsItem|string):Promise<ArkPackage|undefined>
    {

        if(typeof item === 'string'){
            const r=await this.vfs.getItemAsync(item);
            if(!r){
                return undefined;
            }
            item=r;
        }

        if(!item){
            return undefined;
        }

        let pkg=arkPackageFromVfsItem(item);
        if(!pkg){
            return undefined;
        }
        const pkgDir=item.type==='dir' && pkg.isModule?item.path:undefined;
        const overridePath=pkgDir?joinPaths(pkgDir,arkPackageFilename):item.path.endsWith('.json')?item.path:undefined;

        if(overridePath){
            const pkgOverrides=await this.vfs.readObjectAsync(overridePath);
            if(pkgOverrides){
                pkg=mergeArkPackages(pkg,pkgOverrides);
            }
        }

        if(pkg.controllers){
            for(const c of pkg.controllers){
                this.registerController(c);
            }
        }

        if(pkgDir){

            const childItems:VfsItem[]=[];
            const controllers:ArkPackageCtrlRef[]=[];

            await this.vfs.enumDirAsync({path:pkgDir,filter:{match:scanDirReg}},async (r)=>{
                for(const childItem of r.items){
                    const match=scanDirReg.exec(childItem.name);
                    if(!match){
                        continue;
                    }
                    if(match[1]){
                        controllers.push({
                            type:match[2]??'',
                            controllerPath:childItem.path
                        })
                    }else{
                        childItems.push(childItem);
                    }
                }
                return true;
            });

            for(const c of controllers){
                this.registerController(c);
            }

            if(childItems.length){
                if(!pkg.children){
                    pkg.children=[];
                }
                for(const childItem of childItems){
                    const child=await this.loadPackageAsync(childItem);
                    if(child){
                        pkg.children.push(child);
                    }
                }
            }
        }

        return pkg;
    }

    public async createPackageCtrlAsync(model:ArkPackage,init=true):Promise<ArkPackageCtrl>{

        let ref=this.getControllerRef(model.type);
        if(!ref){
            ref=await getStdArkPackageCtrlRefAsync(model.type);
        }
        const ctrl=ref?await this.createPackageCtrlByRefAsync(model,ref):new ArkPackageCtrl({runtime:this,model});

        if(init){
            await ctrl.initAsync();
        }

        return ctrl;
    }

    public async createPackageCtrlByRefAsync(model:ArkPackage,ref:ArkPackageCtrlRef):Promise<ArkPackageCtrl>{
        const options:ArkPackageCtrlOptions={model,runtime:this};
        if(ref.controllerClass){
            return new ref.controllerClass(options);
        }
        if(ref.createController){
            return ref.createController(options);
        }
        if(ref.controllerPath){

            const interfaceType=ref.interfaceType??getArkControllerInterfaceTypeByPath(ref.controllerPath);

            switch(interfaceType){

                case 'direct':{
                    const mod=await this.loadJsModuleAsync(ref.controllerPath);
                    const ctrlClass=mod?.[arkControllerClassExportName];
                    if(typeof ctrlClass === 'function'){
                        return new ctrlClass(options);
                    }else{
                        throw new Error('Package controller module did not export a controller class');
                    }
                }

                case 'stdio':
                    return new ArkShellCtrl({...options,controllerPath:ref.controllerPath,controllerArgs:ref.controllerArgs});

                default:
                    throw new Error(`Invalid controller interface type - ${interfaceType}`);
            }

        }else{
            throw new Error('Invalid ArkPackageCtrlRef')
        }
    }

    private readonly _controllerRefs:BehaviorSubject<ArkPackageCtrlRef[]>=new BehaviorSubject<ArkPackageCtrlRef[]>([]);
    public get controllerRefsSubject():ReadonlySubject<ArkPackageCtrlRef[]>{return this._controllerRefs}
    public get controllerRefs(){return this._controllerRefs.value}

    public getControllerRef(type:string):ArkPackageCtrlRef|undefined{
        return this.controllerRefs.find(c=>c.type===type);
    }

    public registerController(ref:ArkPackageCtrlRef){
        if(!isValidArkPackageCtrlRef(ref)){
            throw new Error('Invalid ArkPackageCtrlRef. controllerPath, controllerClass or createController must be defined');
        }
        if(this.controllerRefs.some(r=>r.type===ref.type)){
            return false;
        }
        pushBehaviorSubjectAry(this._controllerRefs,ref);
        return true;
    }

    private readonly jsModules:Record<string,IifeModuleResult>={};
    public async loadJsModuleAsync(path:string):Promise<Record<string,any>|undefined>{
        const match=this.jsModules[path];
        if(match){
            return match.mod;
        }
        const js=await this.vfs.readStringAsync(path);
        if(!js){
            return undefined;
        }
        const mod=createIifeModule(js);
        if(mod.success){
            this.jsModules[path]=mod;
            return mod.mod;
        }else{
            this.log.error(`failed to create ArkRuntime module for path ${path}`,mod.errorMessage);
            return undefined;
        }
    }

}

const scanDirReg=/^.+\.ark-(controller-)?([\w-]+)(\.json)?$/;
