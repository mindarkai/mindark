import { commonArkPackageTypes } from "./mindark-const";
import { ArkPackageCtrlRef } from "./mindark-types";

export const getStdArkPackageCtrlRefAsync=async (type:string):Promise<ArkPackageCtrlRef|undefined>=>{
    switch(type){

        case commonArkPackageTypes.runtime:
            return {type,controllerClass:(await import('./ArkRuntimeEdgeCtrl')).ArkRuntimeEdgeCtrl};

        case commonArkPackageTypes.runtimeDef:
            return {type,controllerClass:(await import('./RuntimeDefCtrl')).RuntimeDefCtrl};

        case commonArkPackageTypes.orchestrator:
            return {type,controllerClass:(await import('./OrchestratorCtrl')).OrchestratorCtrl};

        case commonArkPackageTypes.db:
            return {type,controllerClass:(await import('./package-types/db/ArkDbCtrl')).ArkDbCtrl};

        case commonArkPackageTypes.echo:
            return {type,controllerClass:(await import('./package-types/echo/ArkEchoCtrl')).ArkEchoCtrl};

        case commonArkPackageTypes.history:
            return {type,controllerClass:(await import('./package-types/history/ArkHistoryCtrl')).ArkHistoryCtrl};

        case commonArkPackageTypes.inference:
            return {type,controllerClass:(await import('./package-types/inference/ArkInferenceCtrl')).ArkInferenceCtrl};

        case commonArkPackageTypes.interface:
            return {type,controllerClass:(await import('./package-types/interface/ArkInterfaceCtrl')).ArkInterfaceCtrl};

        case commonArkPackageTypes.lattice:
            return {type,controllerClass:(await import('./package-types/lattice/ArkLatticeCtrl')).ArkLatticeCtrl};

        case commonArkPackageTypes.pulse:
            return {type,controllerClass:(await import('./package-types/pulse/ArkPulseCtrl')).ArkPulseCtrl};

        default:
            return undefined;
    }
}
