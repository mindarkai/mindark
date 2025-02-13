import { triggerNodeBreakpoint } from '@iyio/node-common';
import { ArkRuntimeCtrl } from '@mindarkai/mindark';

export const loadEchoAsync=async ()=>{

    triggerNodeBreakpoint(true);
    const runtime=new ArkRuntimeCtrl();
    runtime.init();

    const echo=await runtime.loadPackageAsync('data/files/fred.ark-echo');
    console.log('ECHO',echo);

    //const echo=await runtime.loadEchoAsync('data/files/fred.echo');

    // const mod=createIifeModule({
    //     debug:true,
    //     scopeVars:{globalValue:70},
    //     js:`
    //         export const meFn=(value)=>value+globalValue
    //     `,
    // })

    // console.log('mod',mod,mod.mod.meFn(7))


}
