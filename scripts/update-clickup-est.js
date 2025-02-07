const fs=require('fs/promises');

// arguments vars
const key=process.env['CLICK_UP_TOKEN'];
const listId=process.env['CLICK_UP_EST_LIST_ID'];
const path=process.env['CLICK_UP_EST_DOC'];
const dryRun=process.argv.includes('--dry-run');
const removeDangling=process.argv.includes('--remove-dangling');

if(!key){
    console.error('env.CLICK_UP_TOKEN required');
    process.exit(1);
}

if(!listId){
    console.error('env.CLICK_UP_EST_LIST_ID required');
    process.exit(1);
}

if(!path){
    console.error('env.CLICK_UP_EST_DOC required');
    process.exit(1);
}

console.info(`Generating ClickUp estimate
document: ${path}
listId: ${listId}
removeDangling: ${removeDangling}
dryRun: ${dryRun}
`)


const listItemReg=/^(\s*)-\s+([^-]*)-?(.*)/
const estReg=/`\s*est\s*(.*?)\s*`/g

const headerReg=/^#+\s+(.*)/


const main=async ()=>{

    const tasks=[];
    const all=[];
    const levels=[];
    const nameStack=[];

    const content=(await fs.readFile(path)).toString().split('\n');
    for(const line of content){

        const itemMatch=listItemReg.exec(line);
        if(!itemMatch){
            continue;
        }
        const depth=Math.floor(Number(itemMatch[1].length)/2);
        const est=[];
        const name=itemMatch[2].replace(estReg,(_,v)=>{
            const args=v.split(/\s+/);
            est.push({
                time:args[0],
                version:args[1]
            });
            return '';
        }).trim();
        nameStack[depth]=name;
        let fullName=nameStack.slice(0,depth+1).join(' - ');

        const item={
            name:fullName,
            est,
            e:est[0],
            depth,
            //dep:levels[depth-1],
            description:itemMatch[3].trim()
        }
        levels[depth]=item;
        //all.push(item);
        if(est.length){
            all.push(item);
            tasks.push(item);
        }
    }

    console.info('Local Tasks:\n'+all.map(t=>`${' '.repeat(t.depth*2)}- ${t.name}`).join('\n'));

    let current=await getAllTasksAsync();
    console.info('Current ClickUp',current.map(c=>c.id+' - '+c.name));

    const getCurrent=(name)=>{
        if(!name){
            return undefined;
        }
        name=name.toLowerCase();
        return current.find(c=>c.name.toLowerCase()===name);
    }

    // for(const c of current){
    //     await deleteTaskAsync(c);
    // }

    for(const c of current){
        const name=c.name.toLowerCase();
        const local=all.find(c=>c.name.toLowerCase()===name);
        if(!local){
            await deleteTaskAsync(c);
        }
    }

    for(const t of all){
        const ct=getCurrent(t.name);
        if(!ct){
            await putTaskAsync(t);
        }
    }

    current=await getAllTasksAsync();

    for(const t of all){
        const ct=getCurrent(t.name);
        if(!ct){
            continue;
        }
        const update={};
        let send=false;

        const pt=getCurrent(t.dep?.name)?.id??null;
        if(ct.parent!==pt){
            update['parent']=pt;
            send=true;
        }

        const time=toTime(t.e?.time)||null;
        if(ct.time_estimate!==time){
            update['time_estimate']=time;
            send=true;
        }

        if(ct.description!==t.description){
            update['description']=t.description;
            send=true;
        }

        if(send){
            await updateTaskAsync(ct.id,ct.name,update);
        }
    }

}

const toTime=(v)=>{
    if(!v){
        return 0;
    }
    const m=/([\d.]+)(\w+)/.exec(v);
    if(!m){
        return 0;
    }
    const n=Number(m[1]);
    switch(m[2]){
        case 'min': return 1000*60*n;
        case 'h': return 1000*60*60*n;
        case 'd': return 1000*60*60*8*n;
        case 'w': return 1000*60*60*40*n;
        case 'm': return 1000*60*60*8*30*n;
        default: return n;

    }
}

const updateTaskAsync=async (id,name,update)=>{

    console.info('Update',id,name,update);

    if(dryRun){
        return;
    }

    await fetch(`https://api.clickup.com/api/v2/task/${id}`,{
        method: 'PUT',
            headers: {
            'Content-Type': 'application/json',
            Authorization: key
        },
        body: JSON.stringify(update)
    });
}

const getAllTasksAsync=async ()=>{

    const all=[];

    let page=0;
    while(true){
        const query = new URLSearchParams({
            archived: 'false',
            include_markdown_description: 'false',
            subtasks:'true',
            page: page.toString(),
        }).toString();
        const resp = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task?${query}`,{
            method: 'GET',
            headers: {
                Authorization: key
            }
        });
        const r=await resp.json();

        all.push(...r.tasks);
        if(r.length<100){
            break;
        }

        page++;

        return all;
    }

    return all;
}

const putTaskAsync=async (task)=>{

    const clickTask={
        name: task.name,
        description: task.description,
        markdown_description: task.description,
        //assignees: [183],
        archived: false,
        tags: task.est.map(e=>e.version).filter(e=>e),
        //status: 'Open',
        notify_all: false,
    }

    console.info('Create task',clickTask,task.est);

    if(dryRun){
        return;
    }

    await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: key
        },
        body: JSON.stringify(clickTask)
    });
}

const deleteTaskAsync=async (clickTask)=>{

    if(!removeDangling){
        console.warn(`\n\x1b[33m! Dangling - ${clickTask.id} - ${clickTask.name}\x1b[0m\n`);
        return;
    }

    console.info(`\n\x1b[31m!! Delete - ${clickTask.id} - ${clickTask.name}\x1b[0m\n`);

    if(dryRun){
        return;
    }

    await fetch(`https://api.clickup.com/api/v2/task/${clickTask.id}`,{
        method: 'DELETE',
        headers: {
        'Content-Type': 'application/json',
        Authorization: key
        }
    });
}

main();
