export const arkStdioMessageStart='"""ark"""';
export const arkStdioMessageTypeSep='"""';
export const arkStdioMessageEnd='"""end"""';

export const arkStdioMessageTypeMsg='msg';

export const createArkStdioMessageLine=(type:string,value:any):string=>
{
    return `${
        arkStdioMessageStart
    }${
        type
    }${
        arkStdioMessageTypeSep
    }${
        value==='undefined'?'undefined':JSON.stringify(value)
    }${arkStdioMessageEnd}\n`
}

export class ArkStdioLineReader
{
    public text:string='';

    public append(text:string[],onValue?:(type:string,value:any)=>void){
        this.text+=text.join('');

        let i:number;
        while((i=this.text.indexOf(arkStdioMessageStart))!==-1){
            const end=this.text.indexOf(arkStdioMessageEnd,i+1);
            if(end===-1){
                const nl=this.text.indexOf('\n',i+1);
                if(nl===-1){// end of message not found yet
                    return;
                }else{
                    this.text=this.text.substring(nl+1);
                    continue;
                }
            }
            const line=this.text.substring(i+arkStdioMessageStart.length,end);
            this.text=this.text.substring(end+arkStdioMessageEnd.length);

            i=line.indexOf(arkStdioMessageTypeSep);
            if(i===-1){
                continue;
            }

            let value:any;
            try{
                value=JSON.parse(line.substring(i+arkStdioMessageTypeSep.length));
            }catch(ex){
                onValue?.('err',ex);
            }

            onValue?.(line.substring(0,i),value);

        }
    }
}
