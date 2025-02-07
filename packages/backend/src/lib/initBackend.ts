import { initRootScope, rootScope, ScopeModule } from "@iyio/common";
import { backendModule } from "./_modules.backend";

let inited=false;
export const initBackend=(additionalModule?:ScopeModule)=>{
    if(inited){
        return;
    }
    inited=true;
    if(rootScope.initCalled()){
        return;
    }
    initRootScope(reg=>{
        reg.use(backendModule);
        reg.use(additionalModule);
    })
}
