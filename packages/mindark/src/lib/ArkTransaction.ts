import { ArkRuntimeCtrl } from "./ArkRuntimeCtrl";

export class ArkRuntimeTransaction
{
    public readonly isJoinable:boolean;

    private _userCount=1;
    public get userCount(){return this._userCount}

    private _isActive=true;
    public get isActive(){return this._isActive}

    private _isCanceled=false;
    public get isCanceled(){return this._isCanceled}

    public readonly runtime:ArkRuntimeCtrl;

    public constructor(isJoinable:boolean,runtime:ArkRuntimeCtrl){
        this.isJoinable=isJoinable;
        this.runtime=runtime;
    }

    public addUser(){
        this._userCount++;
    }

    public commit()
    {
        if(!this._isActive){
            throw new Error('Ark transaction no longer active')
        }
        this.end();
    }

    public cancel()
    {
        if(!this._isActive){
            throw new Error('Ark transaction no longer active')
        }
        this._isCanceled=true;
        this.end();
    }

    private end(){
        this._userCount--;
        if(!this._userCount){
            this._isActive=false;
            const committed=!this._isCanceled;
            this.runtime._endTransaction(this);
            for(const c of this._endCallbacks){
                c(committed);
            }
            if(committed){
                for(const c of this._committedCallbacks){
                    c(committed);
                }
            }

        }
    }

    private readonly _endCallbacks:((committed:boolean)=>void)[]=[];
    private readonly _committedCallbacks:((committed:boolean)=>void)[]=[];
    public onEnd(callback:(committed:boolean)=>void){
        if(this._isActive){
            this._endCallbacks.push(callback);
        }else{
            callback(!this._isCanceled);
        }
    }
    public onCommitted(callback:(committed:boolean)=>void){
        if(this._isActive){
            this._committedCallbacks.push(callback);
        }else if(!this._isCanceled){
            callback(true);
        }
    }
}
