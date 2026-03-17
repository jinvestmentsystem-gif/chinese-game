import json, os, sys
sys.stdout.reconfigure(encoding="utf-8")

with open("content/grade7/classical.json", "r", encoding="utf-8") as f:
    existing = json.load(f)
print(f"Existing: {len(existing)}")

new = []
def q(id,prompt,opts,correct,expl,diff,tags,src="curriculum"):
    new.append({"id":id,"type":"classical","prompt":prompt,"options":opts,"correct":correct,"explanation":expl,"difficulty":diff,"tags":tags,"source":src})

# Will be populated by next step
