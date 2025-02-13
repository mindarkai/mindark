import { openaiConvoModule } from '@convo-lang/convo-lang-openai';
import { parseCliArgs, rootScope } from '@iyio/common';
import { readStdInLineAsync, stopReadingStdIn, triggerNodeBreakpoint } from '@iyio/node-common';
import { initBackend } from "@mindarkai/backend";
import { ArkRuntimeCtrl } from '@mindarkai/mindark';

initBackend(scope=>{
    scope.use(openaiConvoModule);
});

interface LoadArgs
{
    name:string;
    debug:string;
}

const runAsync=async (args:LoadArgs)=>{


    await rootScope.getInitPromise();

    const {name}=args;

    console.log('Load Args',args);

    if(typeof name !== 'string'){
        throw new Error('--name arg required');
    }

    if(args.debug){
        triggerNodeBreakpoint();
    }
    const path=name.includes('/')?name:`${name}.ark-runtime`;
    console.log(`Load runtime - ${path}`)
    const runtime=await ArkRuntimeCtrl.loadRuntimeAsync(path,{
        config:{
            tmpDir:'data/.ark-tmp',
            logMessages:true,
        }
    });

    const help=()=>{
        console.log('load      pkgPath        load package');
        console.log('debug                    Trigger debugger');
        console.log('send   to type payload   Send message');
        console.log('exit                     Exit runtime');
    }
    help();

    let _continue=true;
    try{
        while(_continue){

            const [cmd,...args]=(await readStdInLineAsync()).split(' ').filter(a=>a);
            const arg0=args[0];
            switch(cmd){

                case 'load':
                    if(arg0){
                        console.log(`Loading package from ${arg0}`);
                        const ctrl=await runtime.addChildFromVfsAsync(arg0);
                        console.log('Package controller loaded',ctrl);
                    }else{
                        help();
                    }
                    break;

                case 'exit':
                    _continue=false;
                    break;

                case 'debug':
                    triggerNodeBreakpoint();
                    break;

                case 'send':
                    const msg={
                        to:arg0??'to',
                        type:args[1]??'type',
                        payload:args[2]??'payload'
                    }
                    console.log('Sending',msg);
                    runtime.sendMessage(msg)
                    break;

                default:
                    help();
                    break;
            }

        }
    }finally{
        stopReadingStdIn();
    }

    runtime.dispose();


}

const args=parseCliArgs({args:process.argv});

for(const a in args){
    const v=args[a];
    if(v && v.length===1){
        (args as any)[a]=v[0];
    }
}

runAsync(args as any);
