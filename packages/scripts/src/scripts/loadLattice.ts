import { delayAsync } from '@iyio/common';
import { triggerNodeBreakpoint } from '@iyio/node-common';
import { ArkRuntimeCtrl } from '@mindarkai/mindark';

export const loadEchoAsync=async ()=>{

    triggerNodeBreakpoint(true);
    const runtime=new ArkRuntimeCtrl();
    await runtime.initAsync();

    const lattice=await runtime.addChildFromVfsAsync('data/files/main.ark-lattice');
    console.log('lattice',JSON.stringify(lattice?.pkg,null,4));

    await delayAsync(5000);


}
