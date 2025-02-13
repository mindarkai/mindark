import { readStdInLineAsync, stopReadingStdIn, triggerNodeBreakpoint } from '@iyio/node-common';
import { ArkRuntimeCtrl } from '@mindarkai/mindark';

interface LoadArgs
{
    name:string;
    debug:string;
}

export const loadAsync=async (args:LoadArgs)=>{

    const {name}=args;

    console.log('Load Args',args);

    if(typeof name !== 'string'){
        throw new Error('--name arg required');
    }

    if(args.debug){
        triggerNodeBreakpoint();
    }
    const path=name.includes('/')?name:`data/files/${name}.ark-runtime`;
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
