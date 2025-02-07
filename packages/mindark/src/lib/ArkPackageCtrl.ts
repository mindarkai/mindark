import { CancelToken, DisposeContainer, OptionalId, ReadonlySubject, joinPaths, pushBehaviorSubjectAry, removeBehaviorSubjectAryValue, shortUuid, wAryPush, wAryRemove, wDeleteProp, wSetProp } from "@iyio/common";
import { VfsItem } from "@iyio/vfs";
import { BehaviorSubject } from "rxjs";
import type { ArkRuntimeCtrl } from "./ArkRuntimeCtrl";
import { arkParentPackagePath, arkSelfPackagePath, commonArkPackageTypes, mindarkUrlProtocol } from "./mindark-const";
import { parseArkUrl } from "./mindark-lib";
import { ArkMessage, ArkMessageDelivery, ArkPackage, ArkPathPart } from "./mindark-types";
import { ArkEchoCtrl } from "./package-types/echo/ArkEchoCtrl";

export interface ArkPackageCtrlOptions<TModel extends ArkPackage=ArkPackage>
{
    runtime:ArkRuntimeCtrl|'self';
    model:TModel;
}

export class ArkPackageCtrl<TModel extends ArkPackage=ArkPackage>
{

    public readonly id:string;
    public readonly name:string;
    public readonly type:string;

    private readonly _path:BehaviorSubject<string>;
    public get pathSubject():ReadonlySubject<string>{return this._path}
    public get path(){return this._path.value}

    private readonly _url:BehaviorSubject<string>;
    public get urlSubject():ReadonlySubject<string>{return this._url}
    public get url(){return this._url.value}

    public readonly runtime:ArkRuntimeCtrl;

    public readonly model:TModel;

    public constructor({
        runtime,
        model,
    }:ArkPackageCtrlOptions<TModel>){
        this.name=model.name;
        this.id=model.id;
        this.type=model.type;
        this.model=model;
        this._path=new BehaviorSubject<string>(this.name);
        this._url=new BehaviorSubject<string>(`${mindarkUrlProtocol}./${this.name}`);
        if(runtime==='self'){
            this.runtime=this as any;
        }else{
            this.runtime=runtime;
        }
        this.idMap[this.id]=this;
        if(this.model.tags){
            for(const t of this.model.tags){
                this.tagMap[t]=[this];
            }
        }
    }

    private _inited=false;
    public get inited(){return this._inited}
    public async initAsync()
    {
        if(this._inited || this._isDisposed){
            return;
        }
        this._inited=true;
        await this.onInitAsync();
    }

    protected async onInitAsync()
    {
        if(this.model.children){
            const copy=[...this.model.children];
            for(const child of copy){
                await this.addChildModelAsync(child);
                if(this.isDisposed){
                    return;
                }
            }
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
        this.onDispose();
        this.disposables.dispose();
        if(this.parent){
            this.parent.removeChild(this);
        }
        this.currentMountToken?.cancelNow();
        this.currentMountToken=undefined;
    }

    protected onDispose()
    {
        // do nothing
    }



    private readonly _children:BehaviorSubject<ArkPackageCtrl[]>=new BehaviorSubject<ArkPackageCtrl[]>([]);
    public get childrenSubject():ReadonlySubject<ArkPackageCtrl[]>{return this._children}
    public get children(){return this._children.value}

    private readonly _parent:BehaviorSubject<ArkPackageCtrl|null>=new BehaviorSubject<ArkPackageCtrl|null>(null);
    public get parentSubject():ReadonlySubject<ArkPackageCtrl|null>{return this._parent}
    public get parent(){return this._parent.value}

    private readonly _parentEcho:BehaviorSubject<ArkEchoCtrl|null>=new BehaviorSubject<ArkEchoCtrl|null>(null);
    public get parentEchoSubject():ReadonlySubject<ArkEchoCtrl|null>{return this._parentEcho}
    public get parentEcho(){return this._parentEcho.value}

    private setParent(parent:ArkPackageCtrl|null){
        const currentParent=this.parent;
        if(currentParent===parent){
            return;
        }
        const echo=parent?.parentEcho;
        this.updateMappings(parent??undefined,currentParent??undefined);
        this._parent.next(parent);
        this._parentEcho.next(echo??null);
        this.updatePath();
    }

    private readonly _isMounted:BehaviorSubject<boolean>=new BehaviorSubject<boolean>(false);
    public get isMountedSubject():ReadonlySubject<boolean>{return this._isMounted}
    public get isMounted(){return this._isMounted.value}

    private checkMounted():boolean{
        return this.type===commonArkPackageTypes.runtime || (this.parent?.checkMounted()??false);
    }

    private currentMountToken:CancelToken|undefined;
    private updateMounted()
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
            this.onMount(c);
        }else{
            this.onUnmount();
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
        if(this.parent && this.parent.type!==commonArkPackageTypes.runtime){
            return this.parent._getPath()+'/'+this.name;
        }else{
            return this.name;
        }
    }

    private updatePath()
    {
        const path=this._getPath();
        const url=this.type===commonArkPackageTypes.runtime?
            (this.runtime.urlPrefix?this.runtime.urlPrefix:`${mindarkUrlProtocol}$${this.runtime.id}`):
            (this.runtime.urlPrefix?joinPaths(this.runtime.urlPrefix,path):`${mindarkUrlProtocol}$${this.runtime.id}/${path}`);
        this._path.next(path);
        this._url.next(url);
        this.updateMounted();
        for(const child of this.children){
            child.updatePath();
        }
    }

    private readonly tagMap:Record<string,ArkPackageCtrl[]>={};
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

    public async addChildFromVfsAsync(child:string|VfsItem):Promise<ArkPackageCtrl|undefined>{
        const pkg=await this.runtime.loadPackageAsync(child);
        if(!pkg){
            return undefined;
        }

        const ctrl=await this.runtime.createPackageCtrlAsync(pkg,true);
        if(!ctrl){
            return;
        }

        this.addChild(ctrl);

        return ctrl;
    }

    public addChild(child:ArkPackageCtrl):boolean{

        if(!child._inited){
            throw new Error(`Package controller must be initialized before being added as child. name:${child.name}, type:${child.type}, id:${child.id}`);
        }

        if(this._isDisposed || this.children.includes(child)){
            return false;
        }
        if(child.parent){
            child.parent.removeChild(child);
        }

        if(!this.model.children?.includes(child.model)){
            if(this.model.children){
                wSetProp(this.model,'children',[]);
            }
            wAryPush(this.model.children,child.model);
        }
        child.setParent(this);
        pushBehaviorSubjectAry(this._children,child);

        return true;
    }

    public removeChild(child:ArkPackageCtrl):boolean{

        if(!this.children.includes(child) || child.parent!==this){
            return false;
        }

        if(this.model.children){
            wAryRemove(this.model.children,child.model);
        }
        child.setParent(null);
        removeBehaviorSubjectAryValue(this._children,child);
        return true;
    }

    public async addChildModelAsync(model:ArkPackage):Promise<ArkPackageCtrl|undefined>{
        if(this._isDisposed){
            return undefined;
        }
        const ctrl=this.getChildByModel(model);
        if(ctrl){
            return ctrl;
        }
        const newCtrl=await this.runtime.createPackageCtrlAsync(model,true);
        if(!newCtrl){
            return undefined;
        }
        this.addChild(newCtrl);
        return newCtrl;
    }

    public removeChildModel(model:ArkPackage):ArkPackageCtrl|undefined{
        const ctrl=this.getChildByModel(model);
        if(!ctrl){
            return undefined;
        }
        this.removeChild(ctrl);
        return ctrl;
    }

    public getChildByModel(model:ArkPackage):ArkPackageCtrl|undefined{
        return this.children.find(c=>c.model===model);
    }

    public getChildByName(name:string):ArkPackageCtrl|undefined{
        for(let i=0;i<this._children.value.length;i++){
            const c=this._children.value[i];
            if(c?.name===name){
                return c;
            }
        }
        return undefined;
    }

    public selectByPath(path:ArkPathPart[],startIndex=0):ArkPackageCtrl|undefined{
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
                    return this.getChildByName(p.value);
                }

            case 'id':
                return this.idMap[p.value];

            case 'tag':
                return this.tagMap[p.value]?.[0];

            default:
                return undefined;
        }
    }


    private readonly _tags:BehaviorSubject<string[]>=new BehaviorSubject<string[]>([]);
    public get tagsSubject():ReadonlySubject<string[]>{return this._tags}
    public get tags(){return this._tags.value}

    public addTag(tag:string){
        if(this.tags.includes(tag)){
            return;
        }
        if(!this.model.tags){
            wSetProp(this.model,'tags',[]);
        }
        if(!this.model.tags?.includes(tag)){
            wAryPush(this.model.tags,tag);
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
    }

    public removeTag(tag:string){
        if(!this.tags.includes(tag)){
            return;
        }

        if(this.model.tags?.includes(tag)){
            wAryRemove(this.model.tags,tag);
        }
        if(this.model.tags?.length===0){
            wDeleteProp(this.model,'tags');
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
