import { IifeModuleResult, Log, PauseableSubjectGroup, ReadonlySubject, createIifeModule, createLog, dupDeleteUndefined, joinPaths, pushBehaviorSubjectAry, shortUuid } from '@iyio/common';
import { VfsCtrl, VfsItem, vfs } from '@iyio/vfs';
import { BehaviorSubject } from 'rxjs';
import { ArkPackageCtrl, ArkPackageCtrlOptions } from './ArkPackageCtrl';
import { ArkShellCtrl } from './ArkShellCtrl';
import { ArkRuntimeTransaction } from './ArkTransaction';
import { arkControllerClassExportName, arkPackageFilename } from './mindark-const';
import { arkPackageFromVfsItem, getArkControllerInterfaceTypeByPath, isValidArkPackageCtrlRef, mergeArkPackages } from './mindark-lib';
import { ArkRuntimeConfigScheme } from './mindark-schemes';
import { ArkPackage, ArkPackageCtrlRef, ArkRuntimeConfig } from './mindark-types';
import { getStdArkPackageCtrlRefAsync } from './std-ark-package-refs';


export interface ArkRuntimeCtrlOptions
{
    id?:string;
    name?:string;
    vfs?:VfsCtrl;
    pkg?:ArkPackage,
    config?:ArkRuntimeConfig;
}

export class ArkRuntimeCtrl extends ArkPackageCtrl<ArkRuntimeConfig>
{

    public readonly log:Log;
    public readonly vfs:VfsCtrl;

    public readonly transactionPauseGroup=new PauseableSubjectGroup();

    public static async loadRuntimeAsync(item:string|VfsItem,options?:ArkRuntimeCtrlOptions){
        const loaderRuntime=new ArkRuntimeCtrl({vfs:options?.vfs});
        try{
            let pkg=await loaderRuntime.loadPackageAsync(item);
            if(!pkg){
                throw new Error('Unable to load runtime package');
            }
            pkg=options?.pkg?mergeArkPackages(pkg,options.pkg):pkg;
            const children=pkg.children;
            if(children){
                pkg={...pkg}
                delete pkg.children;
            }
            const runtime=new ArkRuntimeCtrl({
                ...options,
                pkg
            });
            runtime.init();

            if(children){
                await runtime.addChildrenAsync(children);
            }

            return runtime;
        }finally{
            loaderRuntime.dispose();
        }
    }

    public get urlPrefix():string|undefined{
        return this.getConfig()?.urlPrefix;
    }


    public constructor({
        pkg,
        config,
        id=pkg?.id??shortUuid(),
        name=pkg?.name??'default-ark-runtime',
        vfs:_vfs=vfs(),
    }:ArkRuntimeCtrlOptions={}){
        super({
            runtime:'self',
            pkg:{
                id,
                isModule:true,
                name:'runtime-root',
                path:'/',
                description:'Root of the current ARK runtime',
                children:[],
                ...dupDeleteUndefined(pkg),
                type:'runtime',
                data:{
                    ...pkg?.data,
                    runtime:config??pkg?.data?.['runtime']
                },
            },
            configScheme:ArkRuntimeConfigScheme,
        });

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
            const pkgOverrides=await this.vfs.readObjectAsync<Partial<ArkPackage>>(overridePath);
            if(pkgOverrides){
                pkg=mergeArkPackages(pkg,pkgOverrides);
                if(pkgOverrides.id!==undefined){
                    pkg.persistentId=true;
                }
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

    /**
     * Loads all controller refs for the model and it's descendants
     */
    public async loadControllerClassesAsync(model:ArkPackage):Promise<void>
    {
        const promises:Promise<any>[]=[];
        this._loadControllerClassesAsync(model,promises);
        await Promise.all(promises);
    }

    private _loadControllerClassesAsync(model:ArkPackage,promises:Promise<any>[]):void
    {
        if(!this.isControllerRefReady(model.type)){
            promises.push(this.loadControllerClassAsync(model.type));
        }
        if(model.children){
            for(const c of model.children){
                this._loadControllerClassesAsync(c,promises);
            }
        }
    }

    /**
     * Returns a controller ref with a defined controllerClass or createController callback.
     */
    public async loadControllerClassAsync(type:string):Promise<ArkPackageCtrlRef>
    {
        let ref=this.getControllerRef(type);
        if(ref){
            if(ref.createController || ref.controllerClass){
                return ref;
            }
            if(ref.controllerPath){
                const loadedRef=await this.getControllerRefByPathAsync(ref,ref.controllerPath);
                if(!this._controllerRefs.value.includes(loadedRef)){
                    const update=[...this._controllerRefs.value];
                    const i=update.indexOf(ref);
                    if(i===-1){
                        update.push(loadedRef);
                    }else{
                        update[i]=loadedRef;
                    }
                    this._controllerRefs.next(update);
                }
                return loadedRef;
            }else{
                throw new Error('Invalid ArkPackageCtrlRef')
            }
        }else{
            ref=(await getStdArkPackageCtrlRefAsync(type))??{type,controllerClass:ArkPackageCtrl};
            pushBehaviorSubjectAry(this._controllerRefs,ref);
            return ref;
        }
    }

    private readonly _ctrlByPathPromises:Record<string,Promise<ArkPackageCtrlRef>>={};
    private getControllerRefByPathAsync(ref:ArkPackageCtrlRef,controllerPath:string):Promise<ArkPackageCtrlRef>{
        return this._ctrlByPathPromises[controllerPath]??(
            this._ctrlByPathPromises[controllerPath]=this._getControllerRefByPathAsync(ref,controllerPath)
        )
    }

    private async _getControllerRefByPathAsync(ref:ArkPackageCtrlRef,controllerPath:string):Promise<ArkPackageCtrlRef>{
        const interfaceType=ref.interfaceType??getArkControllerInterfaceTypeByPath(controllerPath);

        switch(interfaceType){

            case 'direct':{
                const mod=await this.loadJsModuleAsync(controllerPath);
                const ctrlClass=mod?.[arkControllerClassExportName];
                if(typeof ctrlClass === 'function'){
                    return {
                        type:ref.type,
                        controllerClass:ctrlClass
                    }
                }else{
                    throw new Error('Package controller module did not export a controller class');
                }
            }

            case 'stdio':
                return {
                    type:ref.type,
                    createController:(options)=>{
                        return new ArkShellCtrl({
                            ...options,
                            controllerPath:controllerPath,
                            controllerArgs:ref.controllerArgs
                        });
                    }
                }

            default:
                throw new Error(`Invalid controller interface type - ${interfaceType}`);
        }
    }

    /**
     * Creates a new package controller for the given package. If the package controller class is
     * not loaded it will be loaded.
     */
    public async createPackageCtrlAsync(model:ArkPackage):Promise<ArkPackageCtrl>{
        await this.loadControllerClassesAsync(model);
        const  ref=this.getControllerRef(model.type);
        const ctrl=ref?this.createPackageCtrlByRef(model,ref,true):new ArkPackageCtrl({runtime:this,pkg: model});
        ctrl.init();
        return ctrl;
    }

    /**
     * Creates a new package controller for the given package. If the package controller class is
     * not loaded the based controller class is used.
     */
    public createPackageCtrl(model:ArkPackage):ArkPackageCtrl{

        const  ref=this.getControllerRef(model.type);
        const ctrl=ref?this.createPackageCtrlByRef(model,ref,true):new ArkPackageCtrl({runtime:this,pkg:model});
        ctrl.init();
        return ctrl;
    }

    public createPackageCtrlByRef(model:ArkPackage,ref:ArkPackageCtrlRef,throwOnNotReady:boolean):ArkPackageCtrl{
        const options:ArkPackageCtrlOptions={pkg: model,runtime:this};
        if(ref.controllerClass){
            return new ref.controllerClass(options);
        }
        if(ref.createController){
            return ref.createController(options);
        }
        if(throwOnNotReady){
            throw new Error(`ArkPackageCtrlRef not ready. type - ${model.type}`);
        }else{
            this.log.warn(`Package controller not ready falling back to based package controller. type - ${model.type}`);
            return new ArkPackageCtrl({runtime:this,pkg:model});
        }
    }

    private readonly _controllerRefs:BehaviorSubject<ArkPackageCtrlRef[]>=new BehaviorSubject<ArkPackageCtrlRef[]>([]);
    public get controllerRefsSubject():ReadonlySubject<ArkPackageCtrlRef[]>{return this._controllerRefs}
    public get controllerRefs(){return this._controllerRefs.value}

    /**
     * Returns true if the controller for the package type is ready to create controller class
     * instances.
     */
    public isControllerRefReady(type:string){
        let ref=this.getControllerRef(type);
        return (ref && (ref.controllerClass || ref.createController))?true:false;
    }

    /**
     * Returns the currently registered controller class for the given type.
     */
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

    private currentTransaction:ArkRuntimeTransaction|null=null;

    public runTransaction<T>(isJoinable:boolean,transactionCallback:(trans:ArkRuntimeTransaction)=>T){
        const trans=this.beginTransaction(isJoinable);
        try{
            return transactionCallback(trans);
        }finally{
            trans.commit();
        }
    }

    public beginTransaction(isJoinable:boolean):ArkRuntimeTransaction
    {
        const current=this.currentTransaction;
        if(current && (!current.isJoinable || !isJoinable)){
            throw new Error(current.isJoinable?
                'Ark transaction already in progress and non joinable transaction requested':
                'Non-joinable Ark transaction already in progress'
            );
        }
        if(current){
            current.addUser();
            return current;
        }else{
            const trans=new ArkRuntimeTransaction(isJoinable,this);
            this.currentTransaction=trans;
            this.transactionPauseGroup.pause();
            return trans;
        }
    }

    _endTransaction(trans:ArkRuntimeTransaction){
        if(trans!==this.currentTransaction){
            throw new Error('Incurrent transaction passed to _endTransaction');
        }
        this.currentTransaction=null;
        this.transactionPauseGroup.resume();
    }

}

const scanDirReg=/^.+\.ark-(controller-)?([\w]+)(\.json)?$/;
