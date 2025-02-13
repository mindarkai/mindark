import { CancelToken, DisposeContainer, OptionalId, PauseableSubject, ReadonlySubject, joinPaths, pushBehaviorSubjectAry, removeBehaviorSubjectAryValue, shortUuid, wAryPush, wAryRemove, wDeleteProp, wSetProp } from "@iyio/common";
import { VfsItem } from "@iyio/vfs";
import { ZodSchema } from "zod";
import type { ArkRuntimeCtrl } from "./ArkRuntimeCtrl";
import { ArkRuntimeTransaction as ArkTransaction } from "./ArkTransaction";
import { arkParentPackagePath, arkSelfPackagePath, commonArkPackageTypes, mindarkUrlProtocol } from "./mindark-const";
import { parseArkUrl } from "./mindark-lib";
import { ArkMessage, ArkMessageDelivery, ArkPackage, ArkPathPart } from "./mindark-types";

export interface ArkPackageCtrlOptions
{
    runtime:ArkRuntimeCtrl|'self';
    pkg:ArkPackage;
    configScheme?:ZodSchema;
    requireConfig?:boolean;
}

export class ArkPackageCtrl<TConfig extends Record<string,any>=Record<string,any>>
{

    public readonly id:string;
    public readonly name:string;
    public readonly type:string;

    private readonly _path:PauseableSubject<string>;
    public get pathSubject():ReadonlySubject<string>{return this._path}
    public get path(){return this._path.value}

    private readonly _url:PauseableSubject<string>;
    public get urlSubject():ReadonlySubject<string>{return this._url}
    public get url(){return this._url.value}

    public readonly runtime:ArkRuntimeCtrl;
    public readonly isRuntimeRoot:boolean;

    public readonly pkg:ArkPackage;

    public readonly configScheme?:ZodSchema;

    /**
     * Pauseable subjects that will be paused during runtime transactions. Subjects should be add
     * in the constructor of the package controller.
     */
    protected readonly transactionSubjects:PauseableSubject<any>[]=[];

    public constructor({
        runtime,
        pkg,
        configScheme,
        requireConfig
    }:ArkPackageCtrlOptions){
        this.name=pkg.name;
        this.id=pkg.id;
        this.type=pkg.type;
        this.pkg=pkg;
        this.configScheme=configScheme??this._configScheme;
        this._path=new PauseableSubject<string>(this.name+'.ark-'+this.type);
        this._url=new PauseableSubject<string>(`${mindarkUrlProtocol}./${this.name}`);
        this.transactionSubjects.push(this._path,this._url,this._parent,this._children,this._isMounted,this._tags);
        if(this.configScheme){
            const config=pkg.data?.[pkg.type];
            if(config || requireConfig){
                const r=this.configScheme.safeParse(config);
                if(!r.success){
                    const msg=`Invalid package config for package type "${pkg.type}"`;
                    if(!(typeof runtime === 'string')){
                        runtime.log.error(msg,r.error,pkg);
                    }
                    throw new Error(msg);
                }
            }
        }
        if(runtime==='self'){
            this.runtime=this as any;
            this.isRuntimeRoot=true;
        }else{
            this.runtime=runtime;
            this.isRuntimeRoot=false;
        }
        this.idMap[this.id]=this;
        if(this.pkg.tags){
            for(const t of this.pkg.tags){
                this.tagMap[t]=[this];
            }
        }
    }

    private _inited=false;
    public get inited(){return this._inited}
    public init()
    {
        if(this._inited || this._isDisposed){
            return;
        }
        this._inited=true;
        Object.freeze(this.transactionSubjects);
        for(const s of this.transactionSubjects){
            this.runtime.transactionPauseGroup.add(s);
        }
        this.onInit();
    }

    protected onInit()
    {
        if(this.pkg.children && !(this.type===commonArkPackageTypes.runtime && !this.isRuntimeRoot)){
            const copy=[...this.pkg.children];
            this.addChildren(copy);
        }
    }

    private readonly disposables=new DisposeContainer();
    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        for(const child of this.children){
            child.dispose();
        }
        this.onDispose();
        this.disposables.dispose();
        if(this.parent){
            this.parent.removeChild(this);
        }
        this.currentMountToken?.cancelNow();
        this.currentMountToken=undefined;
        for(const s of this.transactionSubjects){
            this.runtime.transactionPauseGroup.remove(s);
        }
    }

    protected onDispose()
    {
        // do nothing
    }



    public getTmpDir(){
        const tmp=this.runtime.getConfig()?.tmpDir;
        if(!tmp){
            return undefined;
        }
        return joinPaths(tmp,this.id);
    }

    public getConfig():TConfig|undefined{
        return this.pkg.data?.[this.type];
    }
    protected _configScheme?:ZodSchema;

    public getFullName(separator='-'):string
    {
        if(!this.parent || this.isRuntimeRoot){
            return this.pkg.name;
        }
        return this.parent.getFullName()+separator+this.name
    }



    private readonly _children:PauseableSubject<ArkPackageCtrl[]>=new PauseableSubject<ArkPackageCtrl[]>([]);
    public get childrenSubject():ReadonlySubject<ArkPackageCtrl[]>{return this._children}
    public get children(){return this._children.value}

    private readonly _parent:PauseableSubject<ArkPackageCtrl|null>=new PauseableSubject<ArkPackageCtrl|null>(null);
    public get parentSubject():ReadonlySubject<ArkPackageCtrl|null>{return this._parent}
    public get parent(){return this._parent.value}

    private setParent(parent:ArkPackageCtrl|null,trans:ArkTransaction){
        const currentParent=this.parent;
        if(currentParent===parent){
            return;
        }
        this.updateMappings(parent??undefined,currentParent??undefined);
        this._parent.next(parent);
        this.updatePath(trans);
    }

    private readonly _isMounted:PauseableSubject<boolean>=new PauseableSubject<boolean>(false);
    public get isMountedSubject():ReadonlySubject<boolean>{return this._isMounted}
    public get isMounted(){return this._isMounted.value}

    private checkMounted():boolean{
        return this.isRuntimeRoot || (this.parent?.checkMounted()??false);
    }

    private currentMountToken:CancelToken|undefined;
    private updateMounted(trans:ArkTransaction)
    {
        const m=this.checkMounted();
        if(m===this._isMounted.value){
            return;
        }
        this.currentMountToken?.cancelNow();
        this.currentMountToken=undefined;
        this._isMounted.next(m);
        if(m){
            const c=new CancelToken();
            this.currentMountToken=c;
            trans.onCommitted(()=>this.onMount(c));

        }else{
            trans.onCommitted(()=>this.onUnmount());
        }
    }

    /**
     * A package is mounted when one of its decedents is a runtime
     */
    protected onMount(m:CancelToken)
    {

    }

    protected onUnmount()
    {

    }

    private _getPath():string{
        if(this.isRuntimeRoot){
            return this.pkg.path??this.name+'.ark-'+this.type
        }else if(this.parent){
            return this.parent._getPath()+'/'+this.name+'.ark-'+this.type;
        }else{
            return this.name;
        }
    }

    private updatePath(trans:ArkTransaction)
    {
        const path=this._getPath();
        const url=this.type===commonArkPackageTypes.runtime?
            (this.runtime.urlPrefix?this.runtime.urlPrefix:`${mindarkUrlProtocol}$${this.runtime.id}`):
            (this.runtime.urlPrefix?joinPaths(this.runtime.urlPrefix,path):`${mindarkUrlProtocol}$${this.runtime.id}/${path}`);
        this._path.next(path);
        this._url.next(url);
        this.updateMounted(trans);
        for(const child of this.children){
            child.updatePath(trans);
        }
    }

    private tagMap:Record<string,ArkPackageCtrl[]>={};
    private readonly idMap:Record<string,ArkPackageCtrl>={};

    private updateMappings(newParent:ArkPackageCtrl|undefined,oldParent:ArkPackageCtrl|undefined)
    {
        if(oldParent){
            let p:ArkPackageCtrl|null=oldParent;
            while(p){
                if(p.idMap[this.id]===this){
                    delete p.idMap[this.id];
                }
                for(const tag of this.tags){
                    const ary=p.tagMap[tag];
                    if(!ary){
                        continue;
                    }
                    const i=ary.indexOf(this);
                    if(i===-1){
                        continue;
                    }
                    ary.splice(i,1);
                    if(!ary.length){
                        delete p.tagMap[tag];
                    }

                }
                p=p.parent;
            }
        }
        if(newParent){
            let p:ArkPackageCtrl|null=newParent;
            while(p){
                if(!p.idMap[this.id]){
                    p.idMap[this.id]=this;
                }

                for(const tag of this.tags){
                    const ary=p.tagMap[tag]??(p.tagMap[tag]=[]);
                    if(!ary.includes(this)){
                        ary.push(this);
                    }
                }

                p=p.parent;

            }
            for(const child of this.children){
                child.updateMappings(newParent,undefined);
            }
        }
    }

    /**
     * Adds the given children. Package controller are not automatically loaded.
     */
    public addChildren(children:(ArkPackageCtrl|ArkPackage|null|undefined)[]){
        return this.runtime.runTransaction(false,trans=>{
            let count=0;
            for(const child of children){
                if(!child){
                    continue;
                }
                const c=(child instanceof ArkPackageCtrl)?child:this.runtime.createPackageCtrl(child);
                if(this._addChild(c,trans)){
                    count++;
                }
            }
            return count;
        })
    }

    /**
     * Adds the given child. Package controller are not automatically loaded.
     */
    public addChild(child:ArkPackageCtrl|ArkPackage):boolean{
        const ctrl=(child instanceof ArkPackageCtrl)?child:this.runtime.createPackageCtrl(child);
        return this.runtime.runTransaction(false,trans=>this._addChild(ctrl,trans));
    }

    private _addChild(child:ArkPackageCtrl,trans:ArkTransaction):boolean{

        if(!child._inited){
            throw new Error(`Package controller must be initialized before being added as child. name:${child.name}, type:${child.type}, id:${child.id}`);
        }

        if(this._isDisposed || this.children.includes(child)){
            return false;
        }
        if(child.parent){
            child.parent._removeChild(child,trans);
        }

        if(!this.pkg.children?.includes(child.pkg)){
            if(this.pkg.children){
                wSetProp(this.pkg,'children',[]);
            }
            wAryPush(this.pkg.children,child.pkg);
        }
        child.setParent(this,trans);
        pushBehaviorSubjectAry(this._children,child);

        return true;
    }

    /**
     * Adds the given children and automatically loads package controllers as needed.
     */
    public async addChildrenAsync(models:(ArkPackage|null|undefined)[]):Promise<number>{
        if(this._isDisposed){
            return 0;
        }
        const ctrls=(await Promise.all(models.map(c=>{
            if(!c || this.getChild(c)){
                return undefined;
            }
            return this.runtime.createPackageCtrlAsync(c);
        }))).filter(c=>c) as ArkPackageCtrl[];

        if(ctrls.length){
            return this.addChildren(ctrls);
        }else{
            return 0;
        }
    }

    /**
     * Adds the given child and automatically loads package controllers as needed.
     */
    public async addChildAsync(model:ArkPackage):Promise<ArkPackageCtrl|undefined>{
        if(this._isDisposed){
            return undefined;
        }
        const ctrl=this.getChild(model);
        if(ctrl){
            return ctrl;
        }
        const newCtrl=this.runtime.createPackageCtrl(model);
        if(!newCtrl){
            return undefined;
        }
        this.addChild(newCtrl);
        return newCtrl;
    }

    /**
     * Adds a child package from the VFS and automatically loads package controllers as needed.
     */
    public async addChildFromVfsAsync(child:string|VfsItem):Promise<ArkPackageCtrl|undefined>{
        const pkg=await this.runtime.loadPackageAsync(child);
        if(!pkg){
            return undefined;
        }

        const ctrl=await this.runtime.createPackageCtrlAsync(pkg);
        if(!ctrl){
            return;
        }

        this.addChild(ctrl);

        return ctrl;
    }

    public removeChild(child:ArkPackageCtrl):boolean;
    public removeChild(model:ArkPackage):boolean;
    /**
     * Attempts to remove he given package and returns true if it was removed.
     */
    public removeChild(child:ArkPackageCtrl|ArkPackage):boolean{
        if(!(child instanceof ArkPackageCtrl)){
            const c=this.getChild(child);
            if(!c){
                return false;
            }
            child=c;
        }
        const _c=child;
        return this.runtime.runTransaction(false,trans=>this._removeChild(_c,trans));
    }

    private _removeChild(child:ArkPackageCtrl,trans:ArkTransaction):boolean{

        if(!this.children.includes(child) || child.parent!==this){
            return false;
        }

        if(this.pkg.children){
            wAryRemove(this.pkg.children,child.pkg);
        }
        child.setParent(null,trans);
        removeBehaviorSubjectAryValue(this._children,child);
        return true;
    }





    public getChild(name:string):ArkPackageCtrl|undefined;
    public getChild(model:ArkPackage):ArkPackageCtrl|undefined;
    public getChild(name:ArkPackage|string):ArkPackageCtrl|undefined{
        if(typeof name === 'string'){
            const i=name.indexOf('.ark-');
            if(i!==-1){
                name=name.substring(0,i);
            }
            for(let i=0;i<this._children.value.length;i++){
                const c=this._children.value[i];
                if(c?.name===name){
                    return c;
                }
            }
            return undefined;
        }else{
            return this.children.find(c=>c.pkg===name);
        }

    }

    public selectByPath(path:ArkPathPart[]|string,startIndex=0):ArkPackageCtrl|undefined{
        if(typeof path === 'string'){
            const url=parseArkUrl(path);
            path=url.path;
        }
        let d:ArkPackageCtrl|undefined=this;
        for(let i=startIndex;i<path.length && d;i++){
            const p=path[i];
            if(!p){continue}
            d=d.selectByPart(p);
        }
        return d;
    }

    public selectByPart(p:ArkPathPart):ArkPackageCtrl|undefined{

        switch(p.type){

            case 'name':
                if(p.value===arkParentPackagePath){
                    return this.parent??undefined;
                }else if(p.value===arkSelfPackagePath){
                    return this;
                }else{
                    return this.getChild(p.value);
                }

            case 'id':
                return this.idMap[p.value];

            case 'tag':
                return this.tagMap[p.value]?.[0];

            default:
                return undefined;
        }
    }


    private readonly _tags:PauseableSubject<string[]>=new PauseableSubject<string[]>([]);
    public get tagsSubject():ReadonlySubject<string[]>{return this._tags}
    public get tags(){return this._tags.value}

    public addTag(tag:string){
        if(this.tags.includes(tag)){
            return;
        }
        this.runtime.runTransaction(false,()=>{
            if(!this.pkg.tags){
                wSetProp(this.pkg,'tags',[]);
            }
            if(!this.pkg.tags?.includes(tag)){
                wAryPush(this.pkg.tags,tag);
            }

            let p:ArkPackageCtrl|null=this;
            while(p){
                const ary=p.tagMap[tag]??(p.tagMap[tag]=[]);
                if(!ary.includes(this)){
                    ary.push(this);
                }
                p=p.parent;
            }

            pushBehaviorSubjectAry(this._tags,tag);
            this.updateTagMap();
        })
    }

    public removeTag(tag:string){
        if(!this.tags.includes(tag)){
            return;
        }

        this.runtime.runTransaction(false,()=>{
            if(this.pkg.tags?.includes(tag)){
                wAryRemove(this.pkg.tags,tag);
            }
            if(this.pkg.tags?.length===0){
                wDeleteProp(this.pkg,'tags');
            }

            let p:ArkPackageCtrl|null=this;
            while(p){
                const ary=p.tagMap[tag];
                if(!ary){
                    continue;
                }
                const i=ary.indexOf(this);
                if(i===-1){
                    continue;
                }
                ary.splice(i,1);
                if(!ary.length){
                    delete p.tagMap[tag];
                }
                p=p.parent;
            }

            removeBehaviorSubjectAryValue(this._tags,tag);
            this.updateTagMap();
        });
    }

    private updateTagMap(){
        const map:Record<string,ArkPackageCtrl[]>={};
        this.addToTagMap(map);
        this.tagMap=map;
        this.parent?.updateTagMap();
    }

    private addToTagMap(map:Record<string,ArkPackageCtrl[]>){
        for(const t of this._tags.value){
            const ary=map[t]??(map[t]=[]);
            ary.push(this);
        }
        for(const child of this.children){
            child.addToTagMap(map);
        }
    }


    public sendMessage(msg:OptionalId<ArkMessage>){
        if(msg.id===undefined){
            msg={...msg,id:shortUuid()}
        }

        const delivery:ArkMessageDelivery={
            message:msg as ArkMessage,
            to:parseArkUrl(msg.to),
        };


        (delivery.to.isRelative?this:this.runtime).deliverMessage(delivery);
        return delivery;

    }

    public deliverMessage(delivery:ArkMessageDelivery):ArkPackageCtrl|undefined{
        const i=delivery.pathIndex??0;
        const to=delivery.to;

        if(i>=to.path.length){
            this.handleMessage(delivery.message,delivery);
            return this;
        }

        const part=to.path[i];
        if(!part){
            delivery.onDeliveryFailed?.(this);
            return undefined;
        }

        const next=this.selectByPart(part);
        if(!next){
            delivery.onDeliveryFailed?.(this);
            return undefined;
        }

        delivery.pathIndex=i+1;

        return next.deliverMessage(delivery);
    }

    public handleMessage(msg:ArkMessage,delivery?:ArkMessageDelivery){

        delivery?.onDelivered?.(this);
        this.onMessage(msg,delivery);
    }

    protected onMessage(msg:ArkMessage,delivery?:ArkMessageDelivery){

    }
}
