import sys
import re
import json

print("Example py app open",flush=True)


reg=re.compile(r"^\"\"\"ark\"\"\"(\w+)\"\"\"(.*)\"\"\"end\"\"\"$")

def send_line(type:str,body:str):
    print(f'"""ark"""{type}"""{body}"""end"""\n',flush=True)

def send_msg(to:str, type:str, payload:any):
    msg={
        "type":type,
        "to":to,
        "payload":payload,
    }
    send_line('msg',json.dumps(msg))

for line in sys.stdin:
    print("Received in app-py:" + line.strip().replace('"""',"___"),flush=True)

    match=reg.search(line)
    if match:
        type=match.group(1)
        message=match.group(2)
        print("Ark Message Found",type,'msg',message,flush=True)
        sys.stdout.flush()

        obj=json.loads(message)
        payload=obj['payload']
        if obj['type'] == "math":
            send_line("result","42")

        elif obj['type'] == "relay":
            send_msg("/app-js","relayValue","hello")


