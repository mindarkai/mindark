const readline=require('readline');
const arkStdio=require('./ark-stdio-lib');

let interval=2000;
let step=1;
for(let i=0;i<process.argv.length;i++){
    const n=Number(process.argv[i+1]);
    switch(process.argv[i]){

        case '--interval':{
            if(isFinite(n)){
                interval=n;
            }
            break;
        }

        case '--step':{
            if(isFinite(n)){
                step=n;
            }
            break;
        }
    }
}


const startIv=()=>{
    let i=0;
    const iv=setInterval(()=>{
        i++;
        console.log(`i=${i}`);
    },3000);

    console.log(`Start counting. step=${step}, interval=${interval}ms`);
}

console.log('Reading stdin');

let currentValue=null;

const reader=new arkStdio.ArkStdioLineReader();

const rl=readline.createInterface({
  input:process.stdin,
  output:process.stdout,
  terminal:false
});

rl.on('line',(line)=>{
    console.log('Received in app-js:',line.split('"""').join('___'));
    reader.append([line],(type,msg)=>{
        if(!msg){
            return;
        }
        switch(msg.type){

            case 'startIv':
                clearInterval(iv);
                startIv();
                break;

            case 'exit':
                clearInterval(iv);
                rl.close();
                break;

            case 'set':
                currentValue=msg.payload;
                break;

            case 'get':
                console.log(arkStdio.createArkStdioMessageLine('value',currentValue));
                break;
        }
        console.log(arkStdio.createArkStdioMessageLine('pong',msg.type));
    });
});

rl.once('close',()=>{
     console.log('Closed')
 });
