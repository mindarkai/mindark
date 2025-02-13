import { CancelToken, PromiseSource, createPromiseSource, escapeCommandLineValue, isRooted, joinPaths, strHashBase64Fs } from "@iyio/common";
import { VfsShellStream } from "@iyio/vfs";
import { ArkPackageCtrl } from "./ArkPackageCtrl";
import { ArkRuntimeCtrl } from "./ArkRuntimeCtrl";
import { OrchestratorCtrl } from "./OrchestratorCtrl";
import { RuntimeDefConfig } from "./mindark-types";

/* @todo

- make tag prefix configurable

*/

export class ContainerDeployment
{
    public readonly config:RuntimeDefConfig;

    public readonly pkgCtrl:ArkPackageCtrl;

    public readonly cwd:string;

    public readonly tag:string;

    public readonly workingDir:string;

    private readonly orchestrator:OrchestratorCtrl;

    public readonly runtime:ArkRuntimeCtrl;

    private readonly lifetimePromiseSource:PromiseSource<void>;
    public get lifetimePromise(){return this.lifetimePromiseSource.promise}

    public constructor(config:RuntimeDefConfig,pkgCtrl:ArkPackageCtrl,workingDir:string,orchestrator:OrchestratorCtrl)
    {
        this.config=config;
        this.pkgCtrl=pkgCtrl;
        this.cwd=pkgCtrl.path;
        this.tag='mindark-'+this.pkgCtrl.getFullName();
        this.workingDir=workingDir;
        this.orchestrator=orchestrator;
        this.runtime=orchestrator.runtime;
        this.lifetimePromiseSource=createPromiseSource<void>();
    }

    private _isDisposed=false;
    public get isDisposed(){return this._isDisposed}
    public dispose()
    {
        if(this._isDisposed){
            return;
        }
        this._isDisposed=true;
        this.lifetimePromiseSource.resolve();
    }

    private getDockerProps()
    {
        const engine=this.orchestrator.getConfig()?.engine??OrchestratorCtrl.defaultEngine;
        return {engine,tag:this.tag,dockerCmd:engine==='podman'?'podman':'docker'}
    }

    public async buildImageAsync(cancel?:CancelToken):Promise<string|undefined>
    {
        const {tag,dockerCmd}=this.getDockerProps();

        const cmd=`${dockerCmd} build --tag ${
            escapeCommandLineValue(tag+'---image')
        }${
            this.config.arch?` --arch ${this.config.arch}`:''
        }${this.config.dockerBuildArgs?.length?' ':''}${
            this.config.dockerBuildArgs?.map(a=>escapeCommandLineValue(a)).join(' ')??''
        } .`;

        const release=await this.orchestrator.buildLock.waitOrCancelAsync(cancel);
        if(!release){
            return undefined;
        }

        try{
            if(this.isDisposed || cancel?.isCanceled){
                return undefined;
            }
            await this.runtime.vfs.execShellCmdAsync({
                shellCmd:cmd,
                cwd:this.cwd,
                throwOnError:true,
                cancel
            });

            const inspection=await this.runtime.vfs.execShellCmdAsync({
                shellCmd:`${dockerCmd} inspect ${tag}---image:latest`,
                cwd:this.cwd,
                noLog:true,
            })
            const info:{
               Id?:string,
            }|undefined=JSON.parse(inspection.output)?.[0];

            if(!info?.Id){
                throw new Error(`Unable to get image id for package after build - ${this.cwd}`)
            }

            return info.Id;
        }catch(ex){
            this.runtime.log.error(`Failed to build image for package - ${this.cwd}`,ex);
            return undefined;
        }finally{
            release();
        }
    }

    public async runAsync(imageId:string,cancel:CancelToken)
    {

        try{
            if(this.isDisposed || cancel.isCanceled){
                return;
            }

            const {tag,dockerCmd}=this.getDockerProps();

            const networkName='mindark-'+this.runtime.name;
            await this.runtime.vfs.execShellCmdAsync({
                shellCmd:`${dockerCmd} network create --ignore ${networkName}`,
                cwd:this.cwd
            });
            if(cancel.isCanceled){
                return;
            }

            const envs:string[]=[];
            if(this.config.env){
                const keys=Object.keys(this.config.env);
                keys.sort();
                for(const e of keys){
                    let v=this.config.env[e];
                    if(typeof v!=='string'){
                        v=globalThis.process?.env?.[v?.local??e]??'';
                    }
                    envs.push(` --env ${escapeCommandLineValue(e)}=${escapeCommandLineValue(v)}`)
                }
            }

            const ports:string[]=[];
            if(this.config.ports){
                const defaultPort=3000;
                for(const p of this.config.ports){
                    ports.push(` -p ${p.i??defaultPort}:${p.o??p.i??defaultPort}`)
                }
                ports.sort((a,b)=>a.localeCompare(b))
            }

            const volumes:string[]=[];
            if(this.config.volumes){
                for(const p of this.config.volumes){
                    volumes.push(` -v ${escapeCommandLineValue(p.src)}:${escapeCommandLineValue(p.mount)}`)
                }
                volumes.sort((a,b)=>a.localeCompare(b))
            }

            const labelPlaceholder='**{labels}**'

            let cmd=`${dockerCmd} run --interactive ${
                labelPlaceholder
            } --network=${
                networkName
            } --name=${
                tag
            } --restart=unless-stopped${
                this.config.arch?` --arch ${this.config.arch}`:''
            }${
                this.config.cpuCount?` --cpus ${this.config.cpuCount}`:''
            }${
                this.config.memoryMb?` --memory ${this.config.memoryMb}m`:''
            }${
                envs.length?envs.join(''):''
            }${
                ports?.length?ports.join(''):''
            }${
                volumes?.length?volumes.join(''):''
            }${this.config.dockerBuildArgs?.length?' ':''}${
                this.config.dockerBuildArgs?.map(a=>escapeCommandLineValue(a)).join(' ')??''
            } ${
                escapeCommandLineValue(tag+'---image')
            }`;
            // todo - envs, mounts
            const hash=strHashBase64Fs(imageId+':::::'+cmd);
            const labelKey='mindark-run-hash';
            cmd=cmd.replace(labelPlaceholder,`--label ${labelKey}=${hash}`);

            let action:'create'|'start';

            const cwd=this.cwd;

            const inspection=await this.runtime.vfs.execShellCmdAsync({
                shellCmd:`${dockerCmd} inspect ${tag}`,
                cwd,
                noLog:true,
            })
            if(cancel.isCanceled){
                return;
            }
            if(inspection.exitCode===0){
                const infos:{
                    State?:{
                        Status?:"exited",
                        Running?:boolean,
                        Paused?:boolean,
                        Restarting?:boolean,
                    },
                    Config?:{
                        Labels?:Record<string,any>
                    },
                    Image?:string,
                }[]|undefined=JSON.parse(inspection.output);
                const info=infos?.find(i=>i.Config?.Labels?.[labelKey]);
                const currentHash=info?.Config?.Labels?.[labelKey];
                if((typeof currentHash==='string') && currentHash===hash){
                    action='start';
                }else{
                    action='create';
                }
            }else{
                action='create';
            }

            if(action==='create'){
                await this.runtime.vfs.execShellCmdAsync({
                    shellCmd:`${dockerCmd} rm --force ${tag}`,
                    cwd,
                });
            }else{
                await this.stopAsync();
            }

            cancel.onCancelOrNextTick(()=>{
                this.stopAsync();
            })

            let stream:VfsShellStream;

            if(action==='create'){
                stream=this.runtime.vfs.execShellCmdStream({
                    shellCmd:cmd,
                    cwd,
                    throwOnError:true,
                });
            }else{
                stream=this.runtime.vfs.execShellCmdStream({
                    shellCmd:`${dockerCmd} start --attach --interactive ${tag}`,
                    cwd,
                    throwOnError:true,
                });
            }
            if(cancel.isCanceled){
                return;
            }

            this.pkgCtrl.setRemoteStream(stream);

            await stream.exitPromise;

        }catch(ex){
            if(cancel?.isCanceled){
                return;
            }
            this.runtime.log.warn(`Package run failed. Will restart package - ${this.cwd}`,ex);
        }
    }

    public async stopAsync()
    {
        const {tag,dockerCmd}=this.getDockerProps();

        const cmd=`${dockerCmd} stop ${escapeCommandLineValue(tag)}`;

        await this.runtime.vfs.execShellCmdAsync({shellCmd:cmd,cwd:this.cwd})
    }


    public getDockerComposeService(out:string[],relativeRoot:string,indentation='',tab='    ')
    {
        const dockerFilePath=(
            this.config.dockerFilePath?
                isRooted(this.config.dockerFilePath)?
                    this.config.dockerFilePath
                :
                    joinPaths(relativeRoot,this.config.dockerFilePath)
            :
                joinPaths(this.config.packagePath,'Dockerfile')
        )
        const dockerContext=(
            this.config.dockerContextPath?
                isRooted(this.config.dockerContextPath)?
                    this.config.dockerContextPath
                :
                    joinPaths(relativeRoot,this.config.dockerContextPath)
            :
                this.config.packagePath
        )

        const t1=indentation+tab;
        const t2=t1+tab;
        out.push(`${indentation}${this.pkgCtrl.name}:\n`);

        out.push(`${t1}build:\n`);
        out.push(`${t2}context: ${JSON.stringify(dockerContext)}\n`);
        out.push(`${t2}dockerfile: ${JSON.stringify(dockerFilePath)}\n`);

        out.push(`${t1}hostname: ${JSON.stringify(this.pkgCtrl.name)}:\n`);
        out.push(`${t1}restart: always:\n`);
        out.push(`${t1}container_name: ${JSON.stringify('mindark-'+this.pkgCtrl.getFullName())}:\n`);

        // add volumes

        // add envs

        // add ports
    }
}
