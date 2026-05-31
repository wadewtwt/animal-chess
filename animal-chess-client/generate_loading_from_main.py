import json
import uuid
import os
import shutil

def gen_uuid():
    return str(uuid.uuid4())

def run():
    # 1. Read main.scene
    with open('assets/main.scene', 'r') as f:
        scene_data = json.load(f)
    
    # 2. Setup LoadingScene.ts.meta if not exists
    ts_meta_path = 'assets/scripts/LoadingScene.ts.meta'
    if os.path.exists(ts_meta_path):
        with open(ts_meta_path, 'r') as f:
            ts_meta = json.load(f)
            script_uuid = ts_meta['uuid']
    else:
        script_uuid = gen_uuid()
        ts_meta = {
          "ver": "4.0.24",
          "importer": "typescript",
          "imported": True,
          "uuid": script_uuid,
          "files": [],
          "subMetas": {},
          "userData": {}
        }
        with open(ts_meta_path, 'w') as f:
            json.dump(ts_meta, f, indent=2)

    # 3. Find Canvas node in main.scene
    canvas_node_idx = -1
    for i, item in enumerate(scene_data):
        if item.get('__type__') == 'cc.Node' and item.get('_name') == 'Canvas':
            canvas_node_idx = i
            break
            
    if canvas_node_idx == -1:
        print("Error: Could not find Canvas in main.scene")
        return

    canvas_node = scene_data[canvas_node_idx]
    
    # Identify children of Canvas to remove (we want Canvas to be empty except for Camera)
    # Actually, to be safe, let's keep the Camera component's node (usually named Camera).
    # We will iterate through canvas children. If a child has a cc.Camera component, keep it. Otherwise discard.
    camera_node_id = -1
    for i, item in enumerate(scene_data):
        if item.get('__type__') == 'cc.Camera':
            camera_node_id = item.get('node', {}).get('__id__')
            break

    new_children = []
    for child_ref in canvas_node.get('_children', []):
        child_id = child_ref['__id__']
        if child_id == camera_node_id:
            new_children.append(child_ref)
            
    canvas_node['_children'] = new_children

    # 4. Add LoadingScene component to Canvas
    comp_id = len(scene_data)
    new_comp = {
        "__type__": script_uuid,
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": { "__id__": canvas_node_idx },
        "_enabled": True,
        "__prefab": None,
        "progressBar": None,
        "progressText": None,
        "progressBadge": None,
        "bouncyHero": None,
        "heroBadge": None,
        "_id": gen_uuid()
    }
    scene_data.append(new_comp)
    canvas_node['_components'].append({"__id__": comp_id})

    # 5. Fix scene references (Optional: give new UUIDs to scene_data[1] and scene asset if we care, but Cocos will auto-regenerate UUIDs if duplicated, actually let's just write it as is and give new scene asset UUID)
    scene_data[0]['_name'] = 'loading'
    scene_data[1]['_name'] = 'loading'
    scene_data[1]['_id'] = gen_uuid()
    
    with open('assets/loading.scene', 'w') as f:
        json.dump(scene_data, f, indent=2)

    # 6. Generate loading.scene.meta
    scene_asset_uuid = gen_uuid()
    scene_meta = {
      "ver": "1.0.12",
      "importer": "scene",
      "imported": True,
      "uuid": scene_asset_uuid,
      "files": [],
      "subMetas": {},
      "userData": {}
    }
    with open('assets/loading.scene.meta', 'w') as f:
        json.dump(scene_meta, f, indent=2)

    # 7. Update project.json
    proj_json_path = 'settings/v2/packages/project.json'
    if os.path.exists(proj_json_path):
        with open(proj_json_path, 'r') as f:
            data = json.load(f)
    else:
        data = {}
    
    if "general" not in data:
        data["general"] = {}
    data["general"]["startScene"] = scene_asset_uuid

    with open(proj_json_path, 'w') as f:
        json.dump(data, f, indent=2)

    print("Success")

if __name__ == '__main__':
    run()
