
import { openaiConvoModule } from '@convo-lang/convo-lang-openai';
import { EnvParams, ScopeRegistration } from "@iyio/common";
import { nodeCommonModule } from "@iyio/node-common";
import { VfsCtrl, vfs, vfsMntTypes } from "@iyio/vfs";
import { VfsDiskMntCtrl } from '@iyio/vfs-node';


export const backendModule=(reg:ScopeRegistration)=>{
    reg.addParams(new EnvParams());
    reg.use(nodeCommonModule);

    reg.use(openaiConvoModule);

    reg.implementService(vfs,()=>new VfsCtrl({
        config:{
            mountPoints:[
                {
                    type:vfsMntTypes.file,
                    mountPath:'/',
                    sourceUrl:'.',
                    allowLocalConfig:true,
                    allowExec:true,
                }
            ],
            allowLocalConfig:true,
            allowExec:true,
        },
        mntProviderConfig:{
            ctrls:[new VfsDiskMntCtrl()]
        },
    }))
}

