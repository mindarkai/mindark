export const arkStdioMessageStart='"""ark"""';
export const arkStdioMessageTypeSep='"""';
export const arkStdioMessageEnd='"""end"""';

export const createArkStdioMessageLine=(type,value)=>
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
    text='';

    append(text,onValue){
        this.text+=text.join('');

        let i;
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

            let value;
            try{
                value=JSON.parse(line.substring(i+arkStdioMessageTypeSep.length));
            }catch(ex){
                onValue?.('err',ex);
            }

            onValue?.(line.substring(0,i),value);

        }
    }
}
