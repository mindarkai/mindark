import { openaiConvoModule } from '@convo-lang/convo-lang-openai';
import { rootScope } from "@iyio/common";
import { pathExistsAsync } from "@iyio/node-common";
import { initBackend } from "@mindarkai/backend";
import { basename } from "path";

initBackend(scope=>{
    scope.use(openaiConvoModule);
});

const main=async ()=>{

    await rootScope.getInitPromise();

    const script=basename(process.argv[2]??'');

    try{

        if(!script){
            throw new Error('first argument must be the name of the script to run')
        }

        const possiblePaths=[
            `packages/scripts/src/scripts/${script}.ts`,
            `packages/scripts/src/untracked-scripts/${script}.ts`
        ]
        let path:string|undefined;
        for(const p of possiblePaths){
            if(await pathExistsAsync(p)){
                path=p;
                break;
            }
        }
        if(!path){
            throw new Error(`No script file found by name ${script}`);
        }

        const memStart=process.memoryUsage();

        const mod=await import(path);

        const fns=Object.values(mod);
        if(fns.length!==1 || (typeof fns[0] !=='function')){
            throw new Error(`Script files should export exactly 1 non default function. file - ${path}`);
        }
        const name=Object.keys(mod)[0]??'';

        console.info(`Run script: ${script} - ${name}() - ${path}`);

        const start=Date.now();

        await fns[0]();

        const end=Date.now();
        const mem=process.memoryUsage();
        console.info(`Script complete`);
        console.info(`time: ${end-start}ms`);
        for(const key in mem){
            const n=(mem as any)[key];
            const ms=(memStart as any)[key];
            console.info(`${key}: ${Math.round(n/1024/1024*100)/100}MB / ${Math.round((n-ms)/1024/1024*100)/100}MB`);
        }

    }catch(ex){
        console.error('Script failed',ex);
        process.exit(1);
    }
}

main();
