import { dupDeleteUndefined, getFileExt, joinPaths, shortUuid } from "@iyio/common";
import { VfsItem } from "@iyio/vfs";
import { ZodSchema } from "zod";
import { ArkRuntimeCtrl } from "./ArkRuntimeCtrl";
import { arkPackageUrlProtocol } from "./mindark-const";
import { ArkMessageOptionalIdScheme, ArkMessageScheme, ArkPackageScheme } from "./mindark-schemes";
import { ArkControllerInterfaceType, ArkMessage, ArkMessageOptionalId, ArkPackage, ArkPackageCtrlRef, ArkPathPart, ArkUrl } from "./mindark-types";


export const readEchoPackageAsync=async <T extends ArkPackage>(item:VfsItem,scheme:ZodSchema,runtime:ArkRuntimeCtrl,defaults?:any):Promise<T>=>{
    let pkgBase:ArkPackage&{type:any}={
        name:item.name,
        type:getFileExt(item.name,false,true),
        path:item.path,
        vfsItem:item,
        ...defaults
    }

    const config=await runtime.vfs.readObjectAsync(joinPaths(item.path,item.name+'.json'));
    if(config){
        pkgBase={...pkgBase,...config};
    }

    return scheme.parse(pkgBase);

}

export const isArkPackage=(value:any):value is ArkPackage=>{
    if(!value || (typeof value !=='object')){
        return false;
    }
    const r=ArkPackageScheme.safeParse(value);
    return r.success;
}

export const isArkMessage=(value:any):value is ArkMessage=>{
    if(!value || (typeof value !=='object')){
        return false;
    }
    const r=ArkMessageScheme.safeParse(value);
    return r.success;
}

export const isArkMessageOptionalId=(value:any):value is ArkMessageOptionalId=>{
    if(!value || (typeof value !=='object')){
        return false;
    }
    const r=ArkMessageOptionalIdScheme.safeParse(value);
    return r.success;
}

export const mergeArkPackages=<T extends ArkPackage|Partial<ArkPackage>>(pkg:T,overrides:Partial<ArkPackage>|undefined|null):T=>{
    if(!overrides){
        return {...pkg}
    }
    const r={
        ...pkg,
        ...dupDeleteUndefined(overrides),
        type:pkg.type??overrides.type,
    }
    if(pkg.data){
        if(overrides.data){
            r.data={
                ...pkg.data,
                ...dupDeleteUndefined(overrides.data)
            }
        }else{
            r.data={...pkg.data}
        }
    }else if(overrides.data){
        r.data={...overrides.data}
    }
    if(pkg.tags){
        r.tags=[...pkg.tags];
        if(overrides.tags){
            for(const t of overrides.tags){
                if(!r.tags.includes(t)){
                    r.tags.push(t);
                }
            }
        }
    }else if(overrides.tags){
        r.tags=[...overrides.tags];
    }
    return r;
}

export const arkPackageFromVfsItem=(item:VfsItem):ArkPackage|undefined=>{

    const type=getArkPackageTypeFromPath(item.name);
    if(!type){
        return undefined;
    }

    const i=item.name.indexOf('.ark-');

    return {
        id:shortUuid(),
        type,
        name:i===-1?item.name:item.name.substring(0,i),
        path:item.path,
        vfsItem:item,
        isModule:item.type==='dir'
    }
}

export const getArkPackageTypeFromPath=(path:string):string|undefined=>{
    if(path.endsWith('.json')){
        path=path.substring(0,path.length-5);
        if(!path || path.endsWith('/') || path.endsWith('\\')){
            return undefined;
        }
    }
    const ext=getFileExt(path,false,false);
    if(ext?.startsWith('ark-')){
        return ext.substring(4);
    }else{
        return undefined;
    }
}

export const isValidArkPackageCtrlRef=(ref:ArkPackageCtrlRef):boolean=>{
    return (ref && (ref.controllerClass || ref.controllerPath || ref.createController))?true:false;
}

export const getArkControllerInterfaceTypeByPath=(path:string):ArkControllerInterfaceType=>{
    if(path.toLowerCase().endsWith('.js')){
        return 'direct';
    }else{
        return 'stdio';
    }
}

export const parseArkUrl=(url:string):ArkUrl=>{
    const protoMatch=protoReg.exec(url);
    let path:string;
    let protocol:string;
    let name:string;
    if(protoMatch){
        protocol=protoMatch[1]??'';
        name=protoMatch[2]??'';
        path=protoMatch[3]||'/';
    }else{
        protocol=arkPackageUrlProtocol;
        name='.';
        path=url;
    }

    return {
        url,
        protocol,
        name,
        isRelative:!path.startsWith('/'),
        path:path.split('/').filter(v=>v).map<ArkPathPart>(parseArkUrlPathPart),
    }
}

export const parseArkUrlPathPart=(part:string):ArkPathPart=>{
    if(part.startsWith('@')){
        return {
            type:'tag',
            value:part.substring(1),
        }
    }else if(part.startsWith('$')){
        return {
            type:'id',
            value:part.substring(1),
        }
    }else{
        return {
            type:'name',
            value:part,
        }
    }
}

const protoReg=/^(\w+):\/\/([^\/]+)(.*)/;
