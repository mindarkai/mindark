export const createJsLoader=async ()=>{
    const blob=new Blob([js],{type:'text/javascript'});
    const url=URL.createObjectURL(blob);
    console.log('hio 👋 👋 👋 URL',url);

    const mod=await import(url);
    console.log('hio 👋 👋 👋',mod);
}

const js=/*javascript*/`
const name='Jeff';
export const getName=()=>{
    return name;
}
`
createJsLoader()
